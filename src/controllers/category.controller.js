import { buildCategoryTree } from "../helpers/buildCategoryTree.js";
import Category from "../models/category.model.js";

export const getAllCategory = async (req, res) => {
  try {
    const { page, pageSize, name } = req.query;
    if (!page && !pageSize && !name) {
      const categories = await Category.find().lean().exec();
      const categoryTree = buildCategoryTree(categories);
      return res.status(200).json({
        success: true,
        data: categoryTree,
      });
    } else {
      const pageNumber = parseInt(page) || 1;
      const limitNumber = parseInt(pageSize) || 10;
      const skip = (pageNumber - 1) * limitNumber;
      const filter = name ? { name: { $regex: name, $options: "i" } } : {};
      const [categories, total] = await Promise.all([
        Category.find(filter).skip(skip).limit(limitNumber).lean().exec(),
        Category.countDocuments(filter),
      ]);
      const categoryTree = buildCategoryTree(categories);
      let response = {
        success: true,
        data: categoryTree,
      };
      if (pageSize) {
        response.pagination = {
          currentPage: pageNumber,
          totalPages: Math.ceil(total / limitNumber),
          totalItems: total,
        };
      }
      return res.status(200).json(response);
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: [],
      error: error.message,
    });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, parent } = req.body;

    // Check if category already exists
    const existingCategory = await Category.findOne({ name }).lean();
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Danh mục đã tồn tại",
      });
    }

    let level = 0;
    let parentCategory = null;

    // If parent is provided, find it and set the level
    if (parent) {
      parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: "Danh mục cha không tồn tại",
        });
      }
      level = parentCategory.level + 1;
    }

    // Create new category
    const newCategory = new Category({
      name,
      slug: slugify(name, { lower: true, locale: "vi" }),
      parent: parent || null,
      level,
    });

    const savedCategory = await newCategory.save();

    return res.status(201).json({
      success: true,
      message: "Tạo mới danh mục thành công",
      category: savedCategory,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi tạo danh mục",
      error: error.message,
    });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parent } = req.body;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục cần cập nhật",
      });
    }

    if (name) {
      category.name = name;
      category.slug = slugify(name, { lower: true, locale: "vi" });
    }

    if (parent !== undefined) {
      if (parent === null) {
        // Moving to root level
        category.parent = null;
        category.level = 0;
      } else if (parent !== category.parent?.toString()) {
        const parentCategory = await Category.findById(parent);
        if (!parentCategory) {
          return res.status(400).json({
            success: false,
            message: "Danh mục cha không tồn tại",
          });
        }
        category.parent = parent;
        category.level = parentCategory.level + 1;
      }
    }

    const updatedCategory = await category.save();

    // Update levels of all child categories
    if (category.level !== updatedCategory.level) {
      await updateChildLevels(updatedCategory._id, updatedCategory.level);
    }

    return res.status(200).json({
      success: true,
      message: "Cập nhật danh mục thành công",
      category: updatedCategory,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy khi cập nhật danh mục",
      error: error.message,
    });
  }
};

const updateChildLevels = async (parentId, parentLevel) => {
  const children = await Category.find({ parent: parentId });
  for (const child of children) {
    child.level = parentLevel + 1;
    await child.save();
    await updateChildLevels(child._id, child.level);
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteChildren } = req.query;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục cần xóa",
      });
    }

    // Check if the category has children
    const childrenCount = await Category.countDocuments({ parent: id });

    if (childrenCount > 0 && deleteChildren !== "true") {
      return res.status(400).json({
        success: false,
        message:
          "Danh mục này có danh mục con. Vui lòng xác nhận xóa tất cả hoặc di chuyển chúng trước.",
      });
    }

    if (deleteChildren === "true") {
      // Delete all descendants recursively
      await deleteDescendants(id);
    } else {
      // Move children to parent category
      await Category.updateMany(
        { parent: id },
        { $set: { parent: category.parent, level: category.level } }
      );
    }

    // Delete the category
    await Category.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Xóa danh mục thành công",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa danh mục",
      error: error.message,
    });
  }
};

const deleteDescendants = async (parentId) => {
  const children = await Category.find({ parent: parentId });
  for (const child of children) {
    await deleteDescendants(child._id);
    await Category.findByIdAndDelete(child._id);
  }
};
