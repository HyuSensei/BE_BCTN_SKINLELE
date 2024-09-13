import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import slugify from "slugify";

export const createProduct = async (req, res) => {
  try {
    const {
      name,
      categories,
      brand,
      images,
      price,
      description,
      mainImage,
      variants,
      tags,
      enable,
      capacity,
    } = req.body;

    const newProduct = new Product({
      name,
      categories,
      brand,
      images,
      price,
      description,
      mainImage,
      variants,
      tags,
      enable,
      capacity,
    });

    const savedProduct = await newProduct.save();

    return res.status(201).json({
      success: true,
      message: "Tạo mới sản phẩm thành công",
      data: savedProduct,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi thêm sản phẩm",
      error: error.message,
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      categories,
      brand,
      images,
      price,
      description,
      mainImage,
      variants,
      tags,
      enable,
    } = req.body;

    const updateData = {
      name,
      categories,
      brand,
      images,
      price,
      description,
      mainImage,
      variants,
      tags,
      enable,
    };

    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    if (name) {
      const newSlug = slugify(name, { lower: true, locale: "vi" });
      updateData.slug = newSlug;
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cập nhật sản phẩm thành công",
      data: updatedProduct,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi cập nhật sản phẩm",
      error: error.message,
    });
  }
};

export const removeProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Xóa sản phẩm thành công",
      data: deletedProduct,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi xóa sản phẩm",
      error: error.message,
    });
  }
};

export const getListFromCategory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 12;
    const { slug } = req.params;
    const category = await Category.findOne({ slug });
    const skip = (page - 1) * pageSize;

    const [total, products] = await Promise.all([
      Product.countDocuments({ category: category._id }),
      Product.find({ category: category._id })
        .skip(skip)
        .limit(pageSize)
        .lean()
        .exec(),
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / pageSize),
        totalItems: total,
        pageSize: pageSize,
      },
      data: products,
    });
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

export const getProductHome = async (req, res) => {
  try {
    const { tags } = req.query;
    if (!tags || typeof tags !== "string") {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin tags",
        data: [],
      });
    }

    const tagList = tags.split(",").filter((tag) => tag.trim() !== "");

    if (tagList.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Danh sách tags không hợp lệ",
        data: [],
      });
    }

    const productsByTag = await Promise.all(
      tagList.map(async (tag) => {
        const products = await Product.find({ tags: tag })
          .populate({ path: "categories", select: "name" })
          .populate({ path: "brand", select: "name" })
          .limit(8)
          .exec();

        return {
          tag,
          products,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: productsByTag,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      data: [],
      error: error.message,
    });
  }
};

export const getAllProduct = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 12;
    const { name, category, brand, tag, sort } = req.query;
    const skip = (page - 1) * pageSize;

    let filter = {};
    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }
    if (category) {
      filter.categories = category;
    }
    if (brand) {
      filter.brand = brand;
    }
    if (tag) {
      filter.tags = tag;
    }

    let sortOption = {};
    if (sort === "asc") {
      sortOption = { price: 1 };
    } else if (sort === "desc") {
      sortOption = { price: -1 };
    }

    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .populate({ path: "categories", select: "name" })
        .populate({ path: "brand", select: "name" })
        .sort(sortOption)
        .skip(skip)
        .limit(pageSize)
        .lean()
        .exec(),
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        currentPage: page,
        totalPage: Math.ceil(total / pageSize),
        pageSize: pageSize,
        totalItems: total,
      },
      data: products,
    });
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

export const getProductSearch = async (req, res) => {
  try {
    const { search } = req.query;
    const products = await Product.find({
      name: {
        $regex: search,
        $options: "i",
      },
    });

    return res.status(200).json({
      success: true,
      data: products,
    });
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

export const getProductPageSearch = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 12;
    const { search } = req.query;
    const skip = (page - 1) * pageSize;
    let filter = {};

    if (search) {
      filter = Object.assign(filter, {
        name: {
          $regex: search,
          $options: "i",
        },
      });
    }

    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .populate({ path: "category", select: "name" })
        .skip(skip)
        .limit(pageSize)
        .lean()
        .exec(),
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / pageSize),
        pageSize: pageSize,
        totalItems: total,
      },
      data: products,
    });
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

export const getProductDetailBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const product = await Product.findOne({
      slug,
    }).populate({ path: "category", select: "name slug" });
    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: {},
      error: error.message,
    });
  }
};

