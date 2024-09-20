import Brand from "../models/brand.model.js";
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

    const existingProduct = await Product.findOne({ name }).lean();
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "Tên sản phẩm đã tồn tại",
      });
    }

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
      (key) => updateData[key] === (undefined || "") && delete updateData[key]
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

export const getPriceFilter = (priceRanges) => {
  let priceFilters = [];
  if (priceRanges.length > 0) {
    const min = Math.floor(priceRanges[0].minPrice / 1000) * 1000;
    const max = Math.ceil(priceRanges[0].maxPrice / 1000) * 1000;
    const range = max - min;

    let numRanges;
    if (range <= 100000) {
      numRanges = 1;
    } else if (range <= 500000) {
      numRanges = 2;
    } else if (range <= 1000000) {
      numRanges = 3;
    } else if (range <= 5000000) {
      numRanges = 4;
    } else {
      numRanges = 5;
    }

    const step = Math.ceil(range / numRanges / 10000) * 10000;

    for (let i = min; i < max; i += step) {
      priceFilters.push({
        min: i,
        max: Math.min(i + step, max),
      });
    }
  }
  return priceFilters;
};

export const getListFromCategory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const { slug } = req.params;
    const { priceRange, brands, sortOrder, tags, subcategoriesList } =
      req.query;
    const category = await Category.findOne({ slug });
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Danh mục sản phẩm không tồn tại",
        data: [],
      });
    }

    let categoryIds = [];

    if (subcategoriesList) {
      categoryIds = subcategoriesList.split(",");
    } else {
      categoryIds.push(category._id);
    }

    let query = { categories: { $in: categoryIds }, enable: true };

    if (priceRange) {
      const [min, max] = priceRange.split("-").map(Number);
      query.price = { $gte: min, $lte: max };
    }

    if (brands) {
      const brandIds = await Brand.find({
        slug: { $in: brands.split(",") },
      }).distinct("_id");
      query.brand = { $in: brandIds };
    }

    if (tags) {
      query.tags = { $in: tags.split(",") };
    }

    const skip = (page - 1) * pageSize;

    let productQuery = Product.find(query);

    if (sortOrder === "asc") {
      productQuery = productQuery.sort({ price: 1 });
    } else if (sortOrder === "desc") {
      productQuery = productQuery.sort({ price: -1 });
    }

    const [total, products] = await Promise.all([
      Product.countDocuments(query),
      productQuery.skip(skip).limit(pageSize).populate("brand").lean().exec(),
    ]);

    const [priceRanges, allBrands, subcategories] = await Promise.all([
      Product.aggregate([
        { $match: { categories: { $in: categoryIds }, enable: true } },
        {
          $group: {
            _id: null,
            minPrice: { $min: "$price" },
            maxPrice: { $max: "$price" },
          },
        },
      ]),
      Brand.find({
        _id: {
          $in: await Product.distinct("brand", {
            categories: { $in: categoryIds },
            enable: true,
          }),
        },
      })
        .lean()
        .exec(),
      Category.find({ parent: category._id }).lean().exec(),
    ]);

    const priceFilters = getPriceFilter(priceRanges);

    const filters = {
      priceRanges: priceFilters,
      brands: allBrands,
      subcategories: subcategories,
      tags: ["HOT", "NEW", "SALE", "SELLING", "TREND"],
    };

    return res.status(200).json({
      success: true,
      pagination: {
        page: page,
        totalPage: Math.ceil(total / pageSize),
        totalItems: total,
        pageSize: pageSize,
      },
      category: category.name,
      data: products,
      filters: filters,
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

export const getListFromBrand = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const { slug } = req.params;
    const { priceRange, sortOrder, tags, categoriesList } = req.query;

    const brand = await Brand.findOne({ slug });
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Thương hiệu sản phẩm không tồn tại",
        data: [],
      });
    }

    let query = { brand: brand._id, enable: true };

    if (priceRange) {
      const [min, max] = priceRange.split("-").map(Number);
      query.price = { $gte: min, $lte: max };
    }

    if (categoriesList) {
      const categoryIds = categoriesList.split(",");
      query.categories = { $in: categoryIds };
    }

    if (tags) {
      query.tags = { $in: tags.split(",") };
    }

    const skip = (page - 1) * pageSize;

    let productQuery = Product.find(query);
    if (sortOrder === "asc") {
      productQuery = productQuery.sort({ price: 1 });
    } else if (sortOrder === "desc") {
      productQuery = productQuery.sort({ price: -1 });
    }

    const [total, products] = await Promise.all([
      Product.countDocuments(query),
      productQuery
        .skip(skip)
        .limit(pageSize)
        .populate("categories")
        .lean()
        .exec(),
    ]);

    const [priceRanges, relatedCategories] = await Promise.all([
      Product.aggregate([
        { $match: { brand: brand._id, enable: true } },
        {
          $group: {
            _id: null,
            minPrice: { $min: "$price" },
            maxPrice: { $max: "$price" },
          },
        },
      ]),
      Category.find({
        _id: {
          $in: await Product.distinct("categories", {
            brand: brand._id,
            enable: true,
          }),
        },
      })
        .lean()
        .exec(),
    ]);

    const priceFilters = getPriceFilter(priceRanges);

    const filters = {
      priceRanges: priceFilters,
      categories: relatedCategories,
      tags: ["HOT", "NEW", "SALE", "SELLING", "TREND"],
    };

    return res.status(200).json({
      success: true,
      pagination: {
        page: page,
        totalPage: Math.ceil(total / pageSize),
        totalItems: total,
        pageSize: pageSize,
      },
      brand: brand.name,
      data: products,
      filters: filters,
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
        data: [],
      });
    }

    const tagList = tags.split(",").filter((tag) => tag.trim() !== "");

    if (tagList.length === 0) {
      return res.status(400).json({
        success: false,
        data: [],
      });
    }

    const usedProductIds = new Set();
    const productsByTag = [];

    for (const tag of tagList) {
      const products = await Product.find({
        tags: tag,
        _id: { $nin: Array.from(usedProductIds) },
      })
        .populate({ path: "categories", select: "name" })
        .populate({ path: "brand", select: "name" })
        .limit(10)
        .lean()
        .exec();

      products.forEach((product) => usedProductIds.add(product._id.toString()));

      let title;
      switch (tag) {
        case "HOT":
          title = "Sản phẩm nổi bật";
          break;
        case "SELLING":
          title = "Sản phẩm bán chạy";
          break;
        case "NEW":
          title = "Sản phẩm mới";
          break;
        default:
          title = `Sản phẩm ${tag}`;
      }

      productsByTag.push({
        tag,
        title,
        products,
      });
    }

    return res.status(200).json({
      success: true,
      data: productsByTag,
    });
  } catch (error) {
    console.error(error);
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
        page: page,
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
        page: page,
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

export const getProductDetailBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const product = await Product.aggregate([
      { $match: { slug } },
      {
        $lookup: {
          from: "reviews",
          localField: "_id",
          foreignField: "product",
          as: "reviews",
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "categories",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brandDetails",
        },
      },
      { $unwind: "$brandDetails" },
      {
        $project: {
          ...productFields,
          averageRating: {
            $ifNull: [{ $avg: "$reviews.rate" }, 0],
          },
          totalReviews: {
            $size: "$reviews",
          },
          categories: {
            $map: {
              input: "$categoryDetails",
              as: "category",
              in: {
                _id: "$$category._id",
                name: "$$category.name",
                slug: "$$category.slug",
              },
            },
          },
          brand: {
            _id: "$brandDetails._id",
            name: "$brandDetails.name",
            slug: "$brandDetails.slug",
          },
        },
      },
    ]);

    if (product.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
        data: {},
      });
    }

    return res.status(200).json({
      success: true,
      data: product[0],
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

const productFields = {
  _id: 1,
  name: 1,
  slug: 1,
  images: 1,
  price: 1,
  description: 1,
  mainImage: 1,
  variants: 1,
  enable: 1,
  tags: 1,
  capacity: 1,
};
