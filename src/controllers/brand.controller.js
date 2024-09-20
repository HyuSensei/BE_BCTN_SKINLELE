import slugify from "slugify";
import Brand from "../models/brand.model.js";

export const getAllBrand = async (req, res) => {
  try {
    const { page, pageSize, name } = req.query;
    if (!page && !pageSize && !name) {
      const brands = await Brand.find().lean().exec();
      return res.status(200).json({
        success: true,
        data: brands,
      });
    } else {
      const pageNumber = parseInt(page) || 1;
      const limitNumber = parseInt(pageSize) || 10;
      const skip = (pageNumber - 1) * limitNumber;
      const filter = name ? { name: { $regex: name, $options: "i" } } : {};
      const [brands, total] = await Promise.all([
        Brand.find(filter).skip(skip).limit(limitNumber).lean().exec(),
        Brand.countDocuments(filter),
      ]);
      let response = {
        success: true,
        data: brands,
      };
      if (pageSize) {
        response.pagination = {
          page: pageNumber,
          totalPage: Math.ceil(total / limitNumber),
          totalItems: total,
          pageSize: limitNumber,
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

export const createBrand = async (req, res) => {
  try {
    const { name } = req.body;

    const existingBrand = await Brand.findOne({ name });
    if (existingBrand) {
      return res.status(400).json({
        success: false,
        message: "Thương hiệu đã tồn tại",
      });
    }

    const newBrand = new Brand({
      name,
    });

    const savedBrand = await newBrand.save();

    return res.status(201).json({
      success: true,
      message: "Tạo mới thương hiệu thành công",
      brand: savedBrand,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi tạo thương hiệu",
      error: error.message,
    });
  }
};

export const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const brand = await Brand.findById(id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thương hiệu cần cập nhật",
      });
    }

    if (name && name !== brand.name) {
      const existingBrand = await Brand.findOne({ name, _id: { $ne: id } });
      if (existingBrand) {
        return res.status(400).json({
          success: false,
          message: "Tên thương hiệu đã tồn tại",
        });
      }

      brand.name = name;
      brand.slug = slugify(name, { lower: true, locale: "vi" });
    }

    const updatedBrand = await brand.save();

    return res.status(200).json({
      success: true,
      message: "Cập nhật thương hiệu thành công",
      brand: updatedBrand,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi cập nhật thương hiệu",
      error: error.message,
    });
  }
};

// Delete a brand
export const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;

    const brand = await Brand.findById(id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thương hiệu cần xóa",
      });
    }

    await Brand.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Xóa thương hiệu thành công",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi xóa thương hiệu",
      error: error.message,
    });
  }
};
