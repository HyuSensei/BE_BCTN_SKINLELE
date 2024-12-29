import mongoose from "mongoose";
import Brand from "../models/brand.model.js";
import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import slugify from "slugify";
import Promotion from "../models/promotion.model.js";
import {
  getPromotionLookupStage,
  getPromotionFieldsStage,
  getPromotionProjectStage,
  calculateFinalPrice,
} from "../helpers/promotion.helper.js";

import {
  getReviewLookupStage,
  getReviewFieldsStage,
} from "../helpers/review.helper.js";

import {
  getCategoryLookupStage,
  getCategoryProjectStage,
  parseCategoryIds,
  buildCategoryMatchStage,
  getSubcategoriesAnalysisStage,
} from "../helpers/category.helper.js";
import { getFullProjectStage } from "../helpers/product.projection.helper.js";

const getTagTitle = (tag) => {
  switch (tag) {
    case "HOT":
      return "Sản phẩm nổi bật";
    case "SELLING":
      return "Sản phẩm bán chạy";
    case "NEW":
      return "Sản phẩm mới";
    case "SALE":
      return "Sản phẩm khuyến mãi";
    case "TREND":
      return "Sản phẩm xu hướng";
    default:
      return `Sản phẩm ${tag}`;
  }
};

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
      expiry,
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
      expiry: new Date(expiry),
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
      expiry,
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
      expiry: new Date(expiry),
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
    const {
      priceRange,
      brands,
      sortOrder = "asc",
      tags,
      subcategoriesList,
    } = req.query;

    // Find category
    const category = await Category.findOne({ slug });
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Danh mục sản phẩm không tồn tại",
        data: [],
      });
    }

    // Build category match stage
    const categoryIds = subcategoriesList
      ? parseCategoryIds(subcategoriesList)
      : [category._id];

    const matchStage = {
      ...buildCategoryMatchStage(categoryIds),
      enable: true,
    };

    // Add other filters
    if (brands) {
      const brandIds = await Brand.find({
        slug: { $in: brands.split(",") },
      }).distinct("_id");
      matchStage.brand = { $in: brandIds };
    }

    if (tags) {
      matchStage.tags = { $in: tags.split(",") };
    }

    // Build sort stage
    const sortStage = {
      finalPrice: sortOrder === "asc" ? 1 : -1,
    };

    const currentDate = new Date();

    const aggregationPipeline = [
      // Initial match
      { $match: matchStage },

      // Promotion stages
      getPromotionLookupStage(currentDate),
      getPromotionFieldsStage(),

      // Price filter after promotion calculation
      ...(priceRange
        ? [
            {
              $match: {
                finalPrice: {
                  $gte: Number(priceRange.split("-")[0]),
                  $lte: Number(priceRange.split("-")[1]),
                },
              },
            },
          ]
        : []),

      // Review stages
      getReviewLookupStage("reviews"),
      getReviewFieldsStage(),

      // Category & brand stages
      getCategoryLookupStage(),
      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brandInfo",
        },
      },
      { $unwind: "$brandInfo" },

      // Final project
      {
        $project: {
          ...getPromotionProjectStage().$project,
          ...getCategoryProjectStage(),
          brand: {
            _id: "$brandInfo._id",
            name: "$brandInfo.name",
            slug: "$brandInfo.slug",
          },
          totalReviews: 1,
          averageRating: 1,
          ratingDistribution: 1,
        },
      },

      // Sort
      { $sort: sortStage },

      // Facet for pagination and metadata
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: (page - 1) * pageSize }, { $limit: pageSize }],
          ...getSubcategoriesAnalysisStage().$facet,
          allBrands: [
            {
              $group: {
                _id: "$brand._id",
                name: { $first: "$brand.name" },
                slug: { $first: "$brand.slug" },
                productCount: { $sum: 1 },
              },
            },
            { $sort: { productCount: -1 } },
          ],
          priceRanges: [
            {
              $group: {
                _id: null,
                minPrice: { $min: "$finalPrice" },
                maxPrice: { $max: "$finalPrice" },
              },
            },
          ],
        },
      },
    ];

    const [result] = await Product.aggregate(aggregationPipeline);

    const total = result.metadata[0]?.total || 0;
    const products = result.data;
    const subcategories = result.subcategories;
    const allBrands = result.allBrands;
    const priceStats = result.priceRanges[0] || { minPrice: 0, maxPrice: 0 };

    // Build filters
    const filters = {
      priceRanges: getPriceFilter([
        {
          minPrice: priceStats.minPrice,
          maxPrice: priceStats.maxPrice,
        },
      ]),
      brands: allBrands,
      categories: subcategories,
      tags: ["HOT", "NEW", "SALE", "SELLING", "TREND"],
    };

    return res.status(200).json({
      success: true,
      pagination: {
        page,
        totalPage: Math.ceil(total / pageSize),
        totalItems: total,
        pageSize,
      },
      category: category.name,
      data:
        products && products.length > 0
          ? products.map((p) => ({
              ...p,
              finalPrice: calculateFinalPrice(p),
            }))
          : [],
      filters,
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
    const { priceRange, sortOrder = "asc", tags, categoriesList } = req.query;

    // Find brand
    const brand = await Brand.findOne({ slug });
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Thương hiệu sản phẩm không tồn tại",
        data: [],
      });
    }

    // Build match stage
    let matchStage = { brand: brand._id, enable: true };

    if (categoriesList) {
      const categoryIds = categoriesList
        .split(",")
        .map((id) => new mongoose.Types.ObjectId(id));
      matchStage.categories = { $in: categoryIds };
    }

    if (tags) {
      matchStage.tags = { $in: tags.split(",") };
    }

    // Build sort stage
    let sortStage = {};
    if (sortOrder === "asc") {
      sortStage = { finalPrice: 1 };
    } else if (sortOrder === "desc") {
      sortStage = { finalPrice: -1 };
    }

    const currentDate = new Date();

    const aggregationPipeline = [
      // Initial match
      { $match: matchStage },

      // Lookup promotions
      getPromotionLookupStage(currentDate),
      getPromotionFieldsStage(),

      // Price range filter (after calculating finalPrice)
      ...(priceRange
        ? [
            {
              $match: {
                finalPrice: {
                  $gte: Number(priceRange.split("-")[0]),
                  $lte: Number(priceRange.split("-")[1]),
                },
              },
            },
          ]
        : []),

      // Lookup reviews
      getReviewLookupStage("reviews"),
      getReviewFieldsStage(),

      // Lookup relations
      {
        $lookup: {
          from: "categories",
          localField: "categories",
          foreignField: "_id",
          as: "categoriesInfo",
        },
      },

      // Final project
      {
        $project: {
          ...getPromotionProjectStage().$project,
          categories: {
            $map: {
              input: "$categoriesInfo",
              as: "cat",
              in: {
                _id: "$$cat._id",
                name: "$$cat.name",
                slug: "$$cat.slug",
              },
            },
          },
          totalReviews: 1,
          averageRating: 1,
          ratingDistribution: 1,
        },
      },

      // Sort
      { $sort: sortStage },

      // Facet for pagination and metadata
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: (page - 1) * pageSize }, { $limit: pageSize }],
          priceRanges: [
            {
              $group: {
                _id: null,
                minPrice: { $min: "$finalPrice" },
                maxPrice: { $max: "$finalPrice" },
              },
            },
          ],
          relatedCategories: [
            { $unwind: "$categories" },
            {
              $group: {
                _id: "$categories._id",
                name: { $first: "$categories.name" },
                slug: { $first: "$categories.slug" },
              },
            },
          ],
        },
      },
    ];

    const [result] = await Product.aggregate(aggregationPipeline);

    const total = result.metadata[0]?.total || 0;
    const products = result.data;
    const priceStats = result.priceRanges[0] || { minPrice: 0, maxPrice: 0 };
    const relatedCategories = result.relatedCategories;

    // Build price filter ranges
    const priceFilters = getPriceFilter([
      {
        minPrice: priceStats.minPrice,
        maxPrice: priceStats.maxPrice,
      },
    ]);

    // Build filters data
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
      data:
        products && products.length > 0
          ? products.map((p) => ({
              ...p,
              finalPrice: calculateFinalPrice(p),
            }))
          : [],
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

    // Validate tags parameter
    if (!tags || typeof tags !== "string") {
      return res.status(400).json({
        success: false,
        data: [],
      });
    }

    const tagList = tags.split(",").filter((tag) => tag.trim());
    if (tagList.length === 0) {
      return res.status(400).json({
        success: false,
        data: [],
      });
    }

    const currentDate = new Date();
    const productsByTag = [];

    // Process each tag sequentially to avoid memory issues
    for (const tag of tagList) {
      // Get tag title based on type
      const tagTitle = getTagTitle(tag);

      // Build aggregation pipeline for each tag
      const products = await Product.aggregate([
        // Match enabled products with current tag
        {
          $match: {
            tags: tag,
            enable: true,
          },
        },

        // Lookup promotions
        getPromotionLookupStage(currentDate),
        getPromotionFieldsStage(),

        // Lookup reviews
        getReviewLookupStage("reviews"),
        getReviewFieldsStage(),

        // Lookup categories & brand
        getCategoryLookupStage(),
        {
          $lookup: {
            from: "brands",
            localField: "brand",
            foreignField: "_id",
            as: "brandInfo",
          },
        },
        { $unwind: "$brandInfo" },

        // Project final fields
        {
          $project: {
            ...getPromotionProjectStage().$project,
            ...getCategoryProjectStage(),
            brand: {
              _id: "$brandInfo._id",
              name: "$brandInfo.name",
              slug: "$brandInfo.slug",
            },
            totalReviews: 1,
            averageRating: 1,
            ratingDistribution: 1,
          },
        },

        // Sort by rating and promotion
        {
          $sort: {
            averageRating: -1,
            finalPrice: 1,
          },
        },

        // Limit results
        { $limit: 10 },
      ]);

      if (products.length > 0) {
        productsByTag.push({
          tag,
          title: tagTitle,
          products: products.map((p) => ({
            ...p,
            finalPrice: calculateFinalPrice(p),
          })),
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: productsByTag,
    });
  } catch (error) {
    console.error("Get home products error:", error);
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
    const currentDate = new Date();

    const aggregationPipeline = [
      {
        $match: {
          name: { $regex: search, $options: "i" },
          enable: true,
        },
      },
      // Promotion stages
      getPromotionLookupStage(currentDate),
      getPromotionFieldsStage(),

      // Review stages
      getReviewLookupStage("reviews"),
      getReviewFieldsStage(),

      // Category & brand stages
      getCategoryLookupStage(),
      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brandInfo",
        },
      },
      { $unwind: "$brandInfo" },

      // Final project
      {
        $project: {
          ...getPromotionProjectStage().$project,
          ...getCategoryProjectStage(),
          brand: {
            _id: "$brandInfo._id",
            name: "$brandInfo.name",
            slug: "$brandInfo.slug",
          },
          totalReviews: 1,
          averageRating: 1,
          ratingDistribution: 1,
        },
      },
    ];

    const products = await Product.aggregate(aggregationPipeline);

    return res.status(200).json({
      success: true,
      data: products && products.length > 0
      ? products.map((p) => ({
          ...p,
          finalPrice: calculateFinalPrice(p),
        }))
      : [],
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

export const getAllProductByUser = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const sortField = req.query.sortField || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const currentDate = new Date();

    const aggregationPipeline = [
      // Basic match - enabled products
      { $match: { enable: true } },

      // Lookup stages
      getPromotionLookupStage(currentDate),
      getPromotionFieldsStage(),
      getReviewLookupStage("reviews"),
      getReviewFieldsStage(),

      // Lookup relations
      {
        $lookup: {
          from: "categories",
          localField: "categories",
          foreignField: "_id",
          as: "categoriesInfo",
        },
      },
      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brandInfo",
        },
      },
      { $unwind: "$brandInfo" },

      // Project fields
      getFullProjectStage({ createdAt: 1 }),

      // Sort
      {
        $sort: {
          [sortField]: sortOrder,
          _id: 1, // Secondary sort for consistency
        },
      },

      // Facet for pagination
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: (page - 1) * pageSize }, { $limit: pageSize }],
        },
      },
    ];

    const [result] = await Product.aggregate(aggregationPipeline);

    const total = result.metadata[0]?.total || 0;
    const products = result.data;

    return res.status(200).json({
      success: true,
      data:
        products && products.length > 0
          ? products.map((p) => ({
              ...p,
              finalPrice: calculateFinalPrice(p),
            }))
          : [],
      pagination: {
        page,
        pageSize,
        totalPage: Math.ceil(total / pageSize),
        totalItems: total,
      },
    });
  } catch (error) {
    console.error("Get products error:", error);
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
    const currentDate = new Date();

    const product = await Product.aggregate([
      // Match product by slug
      {
        $match: {
          slug,
          enable: true,
        },
      },

      // Lookup stages
      getPromotionLookupStage(currentDate),
      getPromotionFieldsStage(),
      getReviewLookupStage("reviews"),
      getReviewFieldsStage(),

      // Lookup relations
      {
        $lookup: {
          from: "categories",
          localField: "categories",
          foreignField: "_id",
          as: "categoriesInfo",
        },
      },
      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brandInfo",
        },
      },
      { $unwind: "$brandInfo" },

      // Project all fields
      getFullProjectStage(),
    ]);

    if (product.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
        data: {},
      });
    }
    const finalPrice = calculateFinalPrice(product[0]);
    return res.status(200).json({
      success: true,
      data: {
        ...product[0],
        finalPrice,
      },
    });
  } catch (error) {
    console.error("Get product detail error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: {},
      error: error.message,
    });
  }
};

export const getProductByPromotionAdd = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 12;
    const { name, sort } = req.query;
    const skip = (page - 1) * pageSize;

    let filter = {};
    if (name) {
      filter.name = { $regex: name, $options: "i" };
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
        .lean(),
    ]);

    const currentDate = new Date();
    const activeAndFuturePromotions = await Promotion.find({
      endDate: { $gte: currentDate },
    }).lean();

    const promotionMap = new Map();
    activeAndFuturePromotions.forEach((promo) => {
      promo.products.forEach((p) => {
        promotionMap.set(p.product.toString(), {
          promotionId: promo._id,
          promotionName: promo.name,
          discountPercentage: p.discountPercentage,
          maxQty: p.maxQty,
          startDate: promo.startDate,
          endDate: promo.endDate,
        });
      });
    });

    const productsWithPromotionInfo = products.map((product) => {
      const promotionInfo = promotionMap.get(product._id.toString());
      return {
        ...product,
        promotion: promotionInfo
          ? {
              id: promotionInfo.promotionId,
              name: promotionInfo.promotionName,
              discountPercentage: promotionInfo.discountPercentage,
              maxQty: promotionInfo.maxQty,
              startDate: promotionInfo.startDate,
              endDate: promotionInfo.endDate,
            }
          : null,
      };
    });

    return res.status(200).json({
      success: true,
      pagination: {
        page: page,
        totalPage: Math.ceil(total / pageSize),
        pageSize: pageSize,
        totalItems: total,
      },
      data: productsWithPromotionInfo,
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

export const getProductPromotion = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const { priceRange, brands, sortOrder, tags, categoriesList } = req.query;

    const currentDate = new Date();

    // Build match stage
    let matchStage = { enable: true };

    if (categoriesList) {
      const categoryIds = categoriesList
        .split(",")
        .map((id) => new mongoose.Types.ObjectId(id));
      matchStage.categories = { $in: categoryIds };
    }

    if (brands) {
      const brandIds = await Brand.find({
        slug: { $in: brands.split(",") },
      }).distinct("_id");
      matchStage.brand = { $in: brandIds };
    }

    if (tags) {
      matchStage.tags = { $in: tags.split(",") };
    }

    // Build sort stage
    let sortStage = {};
    if (sortOrder === "asc") {
      sortStage = { finalPrice: 1 };
    } else if (sortOrder === "desc") {
      sortStage = { finalPrice: -1 };
    } else {
      sortStage = { "promotion.discountPercentage": -1 };
    }

    const aggregationPipeline = [
      // Lookup promotions
      getPromotionLookupStage(currentDate),
      getPromotionFieldsStage(),

      // Only get products with active promotions
      { $match: { isPromotion: true } },

      // Add other match conditions
      { $match: matchStage },

      // Price range filter after promotion calculation
      ...(priceRange
        ? [
            {
              $match: {
                finalPrice: {
                  $gte: Number(priceRange.split("-")[0]),
                  $lte: Number(priceRange.split("-")[1]),
                },
              },
            },
          ]
        : []),

      // Lookup reviews
      getReviewLookupStage("reviews"),
      getReviewFieldsStage(),

      // Lookup relations
      {
        $lookup: {
          from: "categories",
          localField: "categories",
          foreignField: "_id",
          as: "categoriesInfo",
        },
      },
      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brandInfo",
        },
      },
      { $unwind: "$brandInfo" },

      // Project fields
      getFullProjectStage(),

      // Sort
      { $sort: sortStage },

      // Facet for pagination and filters
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: (page - 1) * pageSize }, { $limit: pageSize }],
          categories: [
            { $unwind: "$categories" },
            {
              $group: {
                _id: "$categories._id",
                name: { $first: "$categories.name" },
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
          ],
          brands: [
            {
              $group: {
                _id: "$brand._id",
                name: { $first: "$brand.name" },
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
          ],
          priceRanges: [
            {
              $group: {
                _id: null,
                minPrice: { $min: "$finalPrice" },
                maxPrice: { $max: "$finalPrice" },
              },
            },
          ],
        },
      },
    ];

    const [result] = await Product.aggregate(aggregationPipeline);

    const total = result.metadata[0]?.total || 0;
    const products = result.data;
    const allCategories = result.categories;
    const allBrands = result.brands;
    const priceStats = result.priceRanges[0] || { minPrice: 0, maxPrice: 0 };

    // Build price filter ranges
    const priceFilters = getPriceFilter([
      {
        minPrice: priceStats.minPrice,
        maxPrice: priceStats.maxPrice,
      },
    ]);

    // Build filters data
    const filters = {
      priceRanges: priceFilters,
      brands: allBrands,
      categories: allCategories,
      tags: ["HOT", "NEW", "SALE", "SELLING", "TREND"],
    };

    return res.status(200).json({
      success: true,
      pagination: {
        page,
        pageSize,
        totalPage: Math.ceil(total / pageSize),
        totalItems: total,
      },
      data:
        products && products.length > 0
          ? products.map((p) => ({
              ...p,
              finalPrice: calculateFinalPrice(p),
            }))
          : [],
      filters,
    });
  } catch (error) {
    console.error("Get promotion products error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: [],
      error: error.message,
    });
  }
};

export const getProductAlmostExpired = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 12;

    const currentDate = new Date();

    const aggregationPipeline = [
      // Match almost expired products
      {
        $match: {
          isAlmostExpired: true,
        },
      },

      // Lookup promotions
      getPromotionLookupStage(currentDate),
      getPromotionFieldsStage(),

      // Lookup reviews
      getReviewLookupStage("reviews"),
      getReviewFieldsStage(),

      // Lookup relations
      {
        $lookup: {
          from: "categories",
          localField: "categories",
          foreignField: "_id",
          as: "categoriesInfo",
        },
      },
      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brandInfo",
        },
      },
      { $unwind: "$brandInfo" },

      // Project fields
      getFullProjectStage({ expiry: 1 }), // Thêm trường expiry

      // Sort by expiry date
      {
        $sort: {
          expiry: 1,
          _id: 1,
        },
      },

      // Facet for pagination
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: (page - 1) * pageSize }, { $limit: pageSize }],
        },
      },
    ];

    const [result] = await Product.aggregate(aggregationPipeline);

    const total = result.metadata[0]?.total || 0;
    const products = result.data;

    return res.status(200).json({
      success: true,
      data:
        products && products.length > 0
          ? products.map((p) => ({
              ...p,
              finalPrice: calculateFinalPrice(p),
            }))
          : [],
      pagination: {
        page,
        pageSize,
        totalPage: Math.ceil(total / pageSize),
        totalItems: total,
      },
    });
  } catch (error) {
    console.error("Get almost expired products error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: [],
      error: error.message,
    });
  }
};
