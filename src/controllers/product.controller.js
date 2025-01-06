import mongoose from "mongoose";
import Brand from "../models/brand.model.js";
import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import slugify from "slugify";
import Promotion from "../models/promotion.model.js";

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
      totalQuantity = 0,
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
      totalQuantity,
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
      totalQuantity,
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
      totalQuantity: totalQuantity ? totalQuantity : 0,
    };

    Object.keys(updateData).forEach(
      (key) =>
        updateData[key] === undefined ||
        (updateData[key] === "" && delete updateData[key])
    );

    if (name) {
      const newSlug = slugify(name, { lower: true, locale: "vi" });
      updateData.slug = newSlug;
    }

    const product = await Product.findOne({ _id: id });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    Object.assign(product, updateData);

    const updatedProduct = await product.save();

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

    let matchStage = {
      categories: {
        $in: categoryIds.map((id) => new mongoose.Types.ObjectId(`${id}`)),
      },
      enable: true,
    };

    if (brands) {
      const brandIds = await Brand.find({
        slug: { $in: brands.split(",") },
      }).distinct("_id");
      matchStage.brand = { $in: brandIds };
    }

    if (tags) {
      matchStage.tags = { $in: tags.split(",") };
    }

    if (priceRange) {
      const [min, max] = priceRange.split("-").map(Number);
      matchStage.price = { $gte: min, $lte: max };
    }

    let sortStage = {};
    if (sortOrder === "asc") {
      sortStage = { price: 1 };
    } else if (sortOrder === "desc") {
      sortStage = { price: -1 };
    }

    const currentDate = new Date();

    const promotionLookupStage = {
      $lookup: {
        from: "promotions",
        let: { productId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $in: ["$$productId", "$products.product"] },
                  { $lte: ["$startDate", currentDate] },
                  { $gte: ["$endDate", currentDate] },
                  { $eq: ["$isActive", true] },
                ],
              },
            },
          },
          { $sort: { startDate: -1 } },
          { $limit: 1 },
          {
            $project: {
              _id: 1,
              name: 1,
              startDate: 1,
              endDate: 1,
              products: {
                $filter: {
                  input: "$products",
                  as: "product",
                  cond: { $eq: ["$$product.product", "$$productId"] },
                },
              },
            },
          },
        ],
        as: "promotionInfo",
      },
    };

    const addPromotionFieldsStage = {
      $addFields: {
        promotionData: { $arrayElemAt: ["$promotionInfo", 0] },
        promotionProduct: { $arrayElemAt: ["$promotionInfo.products", 0] },
        hasValidPromotion: { $gt: [{ $size: "$promotionInfo" }, 0] },
        originalPrice: "$price",
        discountedPrice: {
          $cond: {
            if: { $gt: [{ $size: "$promotionInfo" }, 0] },
            then: {
              $let: {
                vars: {
                  discountPercentage: {
                    $arrayElemAt: [
                      "$promotionInfo.products.discountPercentage",
                      0,
                    ],
                  },
                },
                in: {
                  $round: [
                    {
                      $subtract: [
                        "$price",
                        {
                          $multiply: [
                            "$price",
                            {
                              $divide: [
                                { $arrayElemAt: ["$$discountPercentage", 0] },
                                100,
                              ],
                            },
                          ],
                        },
                      ],
                    },
                    0,
                  ],
                },
              },
            },
            else: "$price",
          },
        },
      },
    };

    const promotionProjectStage = {
      $project: {
        _id: 1,
        name: 1,
        slug: 1,
        mainImage: 1,
        brand: 1,
        categories: 1,
        enable: 1,
        tags: 1,
        variants: 1,
        images: 1,
        originalPrice: 1,
        discountedPrice: 1,
        price: {
          $cond: {
            if: "$hasValidPromotion",
            then: "$discountedPrice",
            else: "$originalPrice",
          },
        },
        promotion: {
          $cond: {
            if: "$hasValidPromotion",
            then: {
              id: "$promotionData._id",
              name: "$promotionData.name",
              discountPercentage: {
                $ifNull: [
                  { $arrayElemAt: ["$promotionProduct.discountPercentage", 0] },
                  0,
                ],
              },
              maxQty: {
                $ifNull: [{ $arrayElemAt: ["$promotionProduct.maxQty", 0] }, 0],
              },
              startDate: "$promotionData.startDate",
              endDate: "$promotionData.endDate",
            },
            else: null,
          },
        },
        totalReviews: 1,
        averageRating: 1,
      },
    };

    const aggregationPipeline = [
      { $match: matchStage },
      promotionLookupStage,
      addPromotionFieldsStage,
      {
        $lookup: {
          from: "reviews",
          localField: "_id",
          foreignField: "product",
          as: "reviews",
        },
      },
      {
        $addFields: {
          totalReviews: { $size: "$reviews" },
          averageRating: { $avg: "$reviews.rate" },
        },
      },
      promotionProjectStage,
      { $sort: sortStage },
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

    // Populate brand information
    await Product.populate(products, { path: "brand" });

    const [priceRanges, allBrands, subcategories] = await Promise.all([
      Product.aggregate([
        {
          $match: {
            categories: {
              $in: categoryIds.map((id) => new mongoose.Types.ObjectId(id)),
            },
            enable: true,
          },
        },
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
      data: products.map((product) => ({
        ...product,
        totalReviews: product.totalReviews || 0,
        averageRating: product.averageRating
          ? Number(product.averageRating.toFixed(1))
          : 0,
      })),
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
    const { priceRange, sortOrder = "asc", tags, categoriesList } = req.query;

    const brand = await Brand.findOne({ slug });
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Thương hiệu sản phẩm không tồn tại",
        data: [],
      });
    }

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

    let sortStage = {};
    if (sortOrder === "asc") {
      sortStage = { price: 1 };
    } else if (sortOrder === "desc") {
      sortStage = { price: -1 };
    }

    const currentDate = new Date();

    const promotionLookupStage = {
      $lookup: {
        from: "promotions",
        let: { productId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $in: ["$$productId", "$products.product"] },
                  { $lte: ["$startDate", currentDate] },
                  { $gte: ["$endDate", currentDate] },
                  { $eq: ["$isActive", true] },
                ],
              },
            },
          },
          { $sort: { startDate: -1 } },
          { $limit: 1 },
          {
            $project: {
              _id: 1,
              name: 1,
              startDate: 1,
              endDate: 1,
              products: {
                $filter: {
                  input: "$products",
                  as: "product",
                  cond: { $eq: ["$$product.product", "$$productId"] },
                },
              },
            },
          },
        ],
        as: "promotionInfo",
      },
    };

    const addPromotionFieldsStage = {
      $addFields: {
        promotionData: { $arrayElemAt: ["$promotionInfo", 0] },
        promotionProduct: { $arrayElemAt: ["$promotionInfo.products", 0] },
        hasValidPromotion: { $gt: [{ $size: "$promotionInfo" }, 0] },
        originalPrice: "$price",
        discountedPrice: {
          $cond: {
            if: { $gt: [{ $size: "$promotionInfo" }, 0] },
            then: {
              $let: {
                vars: {
                  discountPercentage: {
                    $arrayElemAt: [
                      "$promotionInfo.products.discountPercentage",
                      0,
                    ],
                  },
                },
                in: {
                  $round: [
                    {
                      $subtract: [
                        "$price",
                        {
                          $multiply: [
                            "$price",
                            {
                              $divide: [
                                { $arrayElemAt: ["$$discountPercentage", 0] },
                                100,
                              ],
                            },
                          ],
                        },
                      ],
                    },
                    0,
                  ],
                },
              },
            },
            else: "$price",
          },
        },
      },
    };

    const promotionProjectStage = {
      $project: {
        _id: 1,
        name: 1,
        slug: 1,
        mainImage: 1,
        brand: 1,
        categories: 1,
        enable: 1,
        tags: 1,
        variants: 1,
        images: 1,
        originalPrice: 1,
        discountedPrice: 1,
        price: {
          $cond: {
            if: "$hasValidPromotion",
            then: "$discountedPrice",
            else: "$originalPrice",
          },
        },
        promotion: {
          $cond: {
            if: "$hasValidPromotion",
            then: {
              id: "$promotionData._id",
              name: "$promotionData.name",
              discountPercentage: {
                $ifNull: [
                  { $arrayElemAt: ["$promotionProduct.discountPercentage", 0] },
                  0,
                ],
              },
              maxQty: {
                $ifNull: [{ $arrayElemAt: ["$promotionProduct.maxQty", 0] }, 0],
              },
              startDate: "$promotionData.startDate",
              endDate: "$promotionData.endDate",
            },
            else: null,
          },
        },
        totalReviews: 1,
        averageRating: 1,
      },
    };

    if (priceRange) {
      const [min, max] = priceRange.split("-").map(Number);
      matchStage.price = { $gte: min, $lte: max };
    }

    const aggregationPipeline = [
      { $match: matchStage },
      promotionLookupStage,
      addPromotionFieldsStage,
      {
        $lookup: {
          from: "reviews",
          localField: "_id",
          foreignField: "product",
          as: "reviews",
        },
      },
      {
        $addFields: {
          totalReviews: { $size: "$reviews" },
          averageRating: { $avg: "$reviews.rate" },
        },
      },
      promotionProjectStage,
      { $sort: sortStage },
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

    await Product.populate(products, { path: "categories" });

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
      data: products.map((product) => ({
        ...product,
        totalReviews: product.totalReviews || 0,
        averageRating: product.averageRating
          ? Number(product.averageRating.toFixed(1))
          : 0,
      })),
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

    const currentDate = new Date();

    for (const tag of tagList) {
      const products = await Product.aggregate([
        { $match: { tags: tag, _id: { $nin: Array.from(usedProductIds) } } },
        {
          $lookup: {
            from: "promotions",
            let: { productId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ["$$productId", "$products.product"] },
                      { $lte: ["$startDate", currentDate] },
                      { $gte: ["$endDate", currentDate] },
                      { $eq: ["$isActive", true] },
                    ],
                  },
                },
              },
              { $sort: { startDate: -1 } },
              { $limit: 1 },
              {
                $project: {
                  _id: 1,
                  name: 1,
                  startDate: 1,
                  endDate: 1,
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: { $eq: ["$$product.product", "$$productId"] },
                    },
                  },
                },
              },
            ],
            as: "promotionInfo",
          },
        },
        {
          $addFields: {
            promotionData: { $arrayElemAt: ["$promotionInfo", 0] },
            promotionProduct: { $arrayElemAt: ["$promotionInfo.products", 0] },
            hasValidPromotion: { $gt: [{ $size: "$promotionInfo" }, 0] },
            originalPrice: "$price",
            discountedPrice: {
              $cond: {
                if: { $gt: [{ $size: "$promotionInfo" }, 0] },
                then: {
                  $let: {
                    vars: {
                      discountPercentage: {
                        $arrayElemAt: [
                          "$promotionInfo.products.discountPercentage",
                          0,
                        ],
                      },
                    },
                    in: {
                      $round: [
                        {
                          $subtract: [
                            "$price",
                            {
                              $multiply: [
                                "$price",
                                {
                                  $divide: [
                                    {
                                      $arrayElemAt: ["$$discountPercentage", 0],
                                    },
                                    100,
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                        0,
                      ],
                    },
                  },
                },
                else: "$price",
              },
            },
          },
        },
        {
          $lookup: {
            from: "reviews",
            localField: "_id",
            foreignField: "product",
            as: "reviews",
          },
        },
        {
          $addFields: {
            totalReviews: { $size: "$reviews" },
            averageRating: { $avg: "$reviews.rate" },
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            slug: 1,
            mainImage: 1,
            brand: 1,
            categories: 1,
            enable: 1,
            tags: 1,
            variants: 1,
            images: 1,
            originalPrice: 1,
            discountedPrice: 1,
            price: {
              $cond: {
                if: "$hasValidPromotion",
                then: "$discountedPrice",
                else: "$originalPrice",
              },
            },
            promotion: {
              $cond: {
                if: "$hasValidPromotion",
                then: {
                  id: "$promotionData._id",
                  name: "$promotionData.name",
                  discountPercentage: {
                    $ifNull: [
                      {
                        $arrayElemAt: [
                          "$promotionProduct.discountPercentage",
                          0,
                        ],
                      },
                      0,
                    ],
                  },
                  maxQty: {
                    $ifNull: [
                      { $arrayElemAt: ["$promotionProduct.maxQty", 0] },
                      0,
                    ],
                  },
                  startDate: "$promotionData.startDate",
                  endDate: "$promotionData.endDate",
                },
                else: null,
              },
            },
            totalReviews: 1,
            averageRating: 1,
          },
        },
        { $limit: 10 },
      ]);

      await Product.populate(products, [
        { path: "categories", select: "name" },
        { path: "brand", select: "name" },
      ]);

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
        products: products.map((product) => ({
          ...product,
          totalReviews: product.totalReviews || 0,
          averageRating: product.averageRating
            ? Number(product.averageRating.toFixed(1))
            : 0,
        })),
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
    const currentDate = new Date();

    const aggregationPipeline = [
      {
        $match: {
          name: { $regex: search, $options: "i" },
          enable: true,
        },
      },
      {
        $lookup: {
          from: "promotions",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$$productId", "$products.product"] },
                    { $lte: ["$startDate", currentDate] },
                    { $gte: ["$endDate", currentDate] },
                    { $eq: ["$isActive", true] },
                  ],
                },
              },
            },
            { $sort: { startDate: -1 } },
            { $limit: 1 },
            {
              $project: {
                _id: 1,
                name: 1,
                startDate: 1,
                endDate: 1,
                products: {
                  $filter: {
                    input: "$products",
                    as: "product",
                    cond: { $eq: ["$$product.product", "$$productId"] },
                  },
                },
              },
            },
          ],
          as: "promotionInfo",
        },
      },
      {
        $addFields: {
          promotionData: { $arrayElemAt: ["$promotionInfo", 0] },
          promotionProduct: { $arrayElemAt: ["$promotionInfo.products", 0] },
          hasValidPromotion: { $gt: [{ $size: "$promotionInfo" }, 0] },
          originalPrice: "$price",
          discountedPrice: {
            $cond: {
              if: { $gt: [{ $size: "$promotionInfo" }, 0] },
              then: {
                $let: {
                  vars: {
                    discountPercentage: {
                      $arrayElemAt: [
                        "$promotionInfo.products.discountPercentage",
                        0,
                      ],
                    },
                  },
                  in: {
                    $round: [
                      {
                        $subtract: [
                          "$price",
                          {
                            $multiply: [
                              "$price",
                              {
                                $divide: [
                                  { $arrayElemAt: ["$$discountPercentage", 0] },
                                  100,
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      0,
                    ],
                  },
                },
              },
              else: "$price",
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          slug: 1,
          mainImage: 1,
          brand: 1,
          categories: 1,
          enable: 1,
          tags: 1,
          variants: 1,
          images: 1,
          originalPrice: 1,
          discountedPrice: 1,
          price: {
            $cond: {
              if: "$hasValidPromotion",
              then: "$discountedPrice",
              else: "$originalPrice",
            },
          },
          promotion: {
            $cond: {
              if: "$hasValidPromotion",
              then: {
                id: "$promotionData._id",
                name: "$promotionData.name",
                discountPercentage: {
                  $ifNull: [
                    {
                      $arrayElemAt: ["$promotionProduct.discountPercentage", 0],
                    },
                    0,
                  ],
                },
                maxQty: {
                  $ifNull: [
                    { $arrayElemAt: ["$promotionProduct.maxQty", 0] },
                    0,
                  ],
                },
                startDate: "$promotionData.startDate",
                endDate: "$promotionData.endDate",
              },
              else: null,
            },
          },
        },
      },
    ];

    const products = await Product.aggregate(aggregationPipeline);

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
      filter.name = { $regex: search, $options: "i" };
    }

    const currentDate = new Date();

    const aggregationPipeline = [
      { $match: filter },
      {
        $lookup: {
          from: "promotions",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$$productId", "$products.product"] },
                    { $lte: ["$startDate", currentDate] },
                    { $gte: ["$endDate", currentDate] },
                    { $eq: ["$isActive", true] },
                  ],
                },
              },
            },
            { $sort: { startDate: -1 } },
            { $limit: 1 },
            {
              $project: {
                _id: 1,
                name: 1,
                startDate: 1,
                endDate: 1,
                products: {
                  $filter: {
                    input: "$products",
                    as: "product",
                    cond: { $eq: ["$$product.product", "$$productId"] },
                  },
                },
              },
            },
          ],
          as: "promotionInfo",
        },
      },
      {
        $addFields: {
          promotionData: { $arrayElemAt: ["$promotionInfo", 0] },
          promotionProduct: { $arrayElemAt: ["$promotionInfo.products", 0] },
          hasValidPromotion: { $gt: [{ $size: "$promotionInfo" }, 0] },
          originalPrice: "$price",
          discountedPrice: {
            $cond: {
              if: { $gt: [{ $size: "$promotionInfo" }, 0] },
              then: {
                $let: {
                  vars: {
                    discountPercentage: {
                      $arrayElemAt: [
                        "$promotionInfo.products.discountPercentage",
                        0,
                      ],
                    },
                  },
                  in: {
                    $round: [
                      {
                        $subtract: [
                          "$price",
                          {
                            $multiply: [
                              "$price",
                              {
                                $divide: [
                                  { $arrayElemAt: ["$$discountPercentage", 0] },
                                  100,
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      0,
                    ],
                  },
                },
              },
              else: "$price",
            },
          },
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
        $project: {
          _id: 1,
          name: 1,
          slug: 1,
          mainImage: 1,
          brand: 1,
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
          enable: 1,
          tags: 1,
          variants: 1,
          images: 1,
          originalPrice: 1,
          discountedPrice: 1,
          price: {
            $cond: {
              if: "$hasValidPromotion",
              then: "$discountedPrice",
              else: "$originalPrice",
            },
          },
          promotion: {
            $cond: {
              if: "$hasValidPromotion",
              then: {
                id: "$promotionData._id",
                name: "$promotionData.name",
                discountPercentage: {
                  $ifNull: [
                    {
                      $arrayElemAt: ["$promotionProduct.discountPercentage", 0],
                    },
                    0,
                  ],
                },
                maxQty: {
                  $ifNull: [
                    { $arrayElemAt: ["$promotionProduct.maxQty", 0] },
                    0,
                  ],
                },
                startDate: "$promotionData.startDate",
                endDate: "$promotionData.endDate",
              },
              else: null,
            },
          },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: pageSize }],
        },
      },
    ];

    const [result] = await Product.aggregate(aggregationPipeline);

    const total = result.metadata[0]?.total || 0;
    const products = result.data;

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
      {
        $lookup: {
          from: "promotions",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$$productId", "$products.product"] },
                    { $lte: ["$startDate", currentDate] },
                    { $gte: ["$endDate", currentDate] },
                    { $eq: ["$isActive", true] },
                  ],
                },
              },
            },
            { $sort: { startDate: -1 } },
            { $limit: 1 },
            {
              $project: {
                _id: 1,
                name: 1,
                startDate: 1,
                endDate: 1,
                products: {
                  $filter: {
                    input: "$products",
                    as: "product",
                    cond: { $eq: ["$$product.product", "$$productId"] },
                  },
                },
              },
            },
          ],
          as: "promotionInfo",
        },
      },
      {
        $addFields: {
          promotionData: { $arrayElemAt: ["$promotionInfo", 0] },
          promotionProduct: { $arrayElemAt: ["$promotionInfo.products", 0] },
          hasValidPromotion: { $gt: [{ $size: "$promotionInfo" }, 0] },
          originalPrice: "$price",
          discountedPrice: {
            $cond: {
              if: { $gt: [{ $size: "$promotionInfo" }, 0] },
              then: {
                $let: {
                  vars: {
                    discountPercentage: {
                      $arrayElemAt: [
                        "$promotionInfo.products.discountPercentage",
                        0,
                      ],
                    },
                  },
                  in: {
                    $round: [
                      {
                        $subtract: [
                          "$price",
                          {
                            $multiply: [
                              "$price",
                              {
                                $divide: [
                                  { $arrayElemAt: ["$$discountPercentage", 0] },
                                  100,
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      0,
                    ],
                  },
                },
              },
              else: "$price",
            },
          },
        },
      },
      {
        $lookup: {
          from: "reviews",
          localField: "_id",
          foreignField: "product",
          as: "reviews",
        },
      },
      {
        $addFields: {
          totalReviews: { $size: "$reviews" },
          averageRating: { $avg: "$reviews.rate" },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          slug: 1,
          mainImage: 1,
          brand: 1,
          categories: 1,
          enable: 1,
          tags: 1,
          variants: 1,
          images: 1,
          originalPrice: 1,
          discountedPrice: 1,
          price: {
            $cond: {
              if: "$hasValidPromotion",
              then: "$discountedPrice",
              else: "$originalPrice",
            },
          },
          promotion: {
            $cond: {
              if: "$hasValidPromotion",
              then: {
                id: "$promotionData._id",
                name: "$promotionData.name",
                discountPercentage: {
                  $ifNull: [
                    {
                      $arrayElemAt: ["$promotionProduct.discountPercentage", 0],
                    },
                    0,
                  ],
                },
                maxQty: {
                  $ifNull: [
                    { $arrayElemAt: ["$promotionProduct.maxQty", 0] },
                    0,
                  ],
                },
                startDate: "$promotionData.startDate",
                endDate: "$promotionData.endDate",
              },
              else: null,
            },
          },
          totalReviews: 1,
          averageRating: 1,
          createdAt: 1,
        },
      },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $sort: { [sortField]: sortOrder } },
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize },
          ],
        },
      },
    ];

    const [result] = await Product.aggregate(aggregationPipeline);

    const products = result.data;
    const totalProducts = result.metadata[0]?.total || 0;

    await Product.populate(products, [
      { path: "categories", select: "name" },
      { path: "brand", select: "name" },
    ]);

    return res.status(200).json({
      success: true,
      data: products.map((product) => ({
        ...product,
        totalReviews: product.totalReviews || 0,
        averageRating: product.averageRating
          ? Number(product.averageRating.toFixed(1))
          : 0,
      })),
      pagination: {
        page: page,
        totalPage: Math.ceil(totalProducts / pageSize),
        totalItems: totalProducts,
        pageSize: pageSize,
      },
    });
  } catch (error) {
    console.error("Error in getAllProductByUser:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi lấy danh sách sản phẩm",
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
      { $match: { slug, enable: true } },
      {
        $lookup: {
          from: "promotions",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$$productId", "$products.product"] },
                    { $lte: ["$startDate", currentDate] },
                    { $gte: ["$endDate", currentDate] },
                    { $eq: ["$isActive", true] },
                  ],
                },
              },
            },
            { $sort: { startDate: -1 } },
            { $limit: 1 },
            {
              $project: {
                _id: 1,
                name: 1,
                startDate: 1,
                endDate: 1,
                products: {
                  $filter: {
                    input: "$products",
                    as: "product",
                    cond: { $eq: ["$$product.product", "$$productId"] },
                  },
                },
              },
            },
          ],
          as: "promotionInfo",
        },
      },
      {
        $addFields: {
          promotionData: { $arrayElemAt: ["$promotionInfo", 0] },
          promotionProduct: { $arrayElemAt: ["$promotionInfo.products", 0] },
          hasValidPromotion: { $gt: [{ $size: "$promotionInfo" }, 0] },
          originalPrice: "$price",
          discountedPrice: {
            $cond: {
              if: { $gt: [{ $size: "$promotionInfo" }, 0] },
              then: {
                $let: {
                  vars: {
                    discountPercentage: {
                      $arrayElemAt: [
                        "$promotionInfo.products.discountPercentage",
                        0,
                      ],
                    },
                  },
                  in: {
                    $round: [
                      {
                        $subtract: [
                          "$price",
                          {
                            $multiply: [
                              "$price",
                              {
                                $divide: [
                                  { $arrayElemAt: ["$$discountPercentage", 0] },
                                  100,
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      0,
                    ],
                  },
                },
              },
              else: "$price",
            },
          },
        },
      },
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
          originalPrice: 1,
          discountedPrice: 1,
          price: {
            $cond: {
              if: "$hasValidPromotion",
              then: "$discountedPrice",
              else: "$originalPrice",
            },
          },
          promotion: {
            $cond: {
              if: "$hasValidPromotion",
              then: {
                id: "$promotionData._id",
                name: "$promotionData.name",
                discountPercentage: {
                  $ifNull: [
                    {
                      $arrayElemAt: ["$promotionProduct.discountPercentage", 0],
                    },
                    0,
                  ],
                },
                maxQty: {
                  $ifNull: [
                    { $arrayElemAt: ["$promotionProduct.maxQty", 0] },
                    0,
                  ],
                },
                startDate: "$promotionData.startDate",
                endDate: "$promotionData.endDate",
              },
              else: null,
            },
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
  description: 1,
  mainImage: 1,
  variants: 1,
  enable: 1,
  tags: 1,
  capacity: 1,
};

export const getProductByPromotionAdd = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : null;
    const { name, sort } = req.query;
    const skip = pageSize ? (page - 1) * pageSize : 0;

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
        .limit(pageSize || 0)
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

    const hasMore = pageSize && products.length === pageSize;

    return res.status(200).json({
      success: true,
      pagination: {
        page: page,
        totalPage: pageSize ? Math.ceil(total / pageSize) : 1,
        pageSize: pageSize || total,
        totalItems: total,
        hasMore: hasMore,
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

    let matchStage = {
      enable: true,
    };

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

    let sortStage = {};
    if (sortOrder === "asc") {
      sortStage = { discountedPrice: 1 };
    } else if (sortOrder === "desc") {
      sortStage = { discountedPrice: -1 };
    } else {
      sortStage = { "promotion.discountPercentage": -1 };
    }

    const promotionLookupStage = {
      $lookup: {
        from: "promotions",
        let: { productId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $in: ["$$productId", "$products.product"] },
                  { $lte: ["$startDate", currentDate] },
                  { $gte: ["$endDate", currentDate] },
                  { $eq: ["$isActive", true] },
                ],
              },
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              startDate: 1,
              endDate: 1,
              products: {
                $filter: {
                  input: "$products",
                  as: "product",
                  cond: { $eq: ["$$product.product", "$$productId"] },
                },
              },
            },
          },
        ],
        as: "promotionInfo",
      },
    };

    const addPromotionFieldsStage = {
      $addFields: {
        promotionData: { $arrayElemAt: ["$promotionInfo", 0] },
        productPromotion: { $arrayElemAt: ["$promotionInfo.products", 0] },
        originalPrice: "$price",
        discountedPrice: {
          $cond: {
            if: { $gt: [{ $size: "$promotionInfo" }, 0] },
            then: {
              $let: {
                vars: {
                  discountPercentage: {
                    $arrayElemAt: [
                      "$promotionInfo.products.discountPercentage",
                      0,
                    ],
                  },
                },
                in: {
                  $round: [
                    {
                      $subtract: [
                        "$price",
                        {
                          $multiply: [
                            "$price",
                            {
                              $divide: [
                                { $arrayElemAt: ["$$discountPercentage", 0] },
                                100,
                              ],
                            },
                          ],
                        },
                      ],
                    },
                    0,
                  ],
                },
              },
            },
            else: "$price",
          },
        },
      },
    };

    // Apply price range filter after calculating discounted price
    if (priceRange) {
      const [min, max] = priceRange.split("-").map(Number);
      matchStage.discountedPrice = { $gte: min, $lte: max };
    }

    const aggregationPipeline = [
      promotionLookupStage,
      { $match: { promotionInfo: { $ne: [] } } },
      addPromotionFieldsStage,
      { $match: matchStage },
      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brandInfo",
        },
      },
      { $unwind: "$brandInfo" },
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
          from: "reviews",
          localField: "_id",
          foreignField: "product",
          as: "reviews",
        },
      },
      {
        $addFields: {
          totalReviews: { $size: "$reviews" },
          averageRating: { $avg: "$reviews.rate" },
          promotion: {
            id: "$promotionData._id",
            name: "$promotionData.name",
            discountPercentage: {
              $arrayElemAt: ["$productPromotion.discountPercentage", 0],
            },
            maxQty: { $arrayElemAt: ["$productPromotion.maxQty", 0] },
            startDate: "$promotionData.startDate",
            endDate: "$promotionData.endDate",
          },
        },
      },
      {
        $project: {
          reviews: 0,
          promotionInfo: 0,
          promotionData: 0,
          productPromotion: 0,
        },
      },
      { $sort: sortStage },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: (page - 1) * pageSize }, { $limit: pageSize }],
          allCategories: [
            { $unwind: "$categoriesInfo" },
            {
              $group: {
                _id: "$categoriesInfo._id",
                name: { $first: "$categoriesInfo.name" },
                slug: { $first: "$categoriesInfo.slug" },
              },
            },
          ],
          allBrands: [
            {
              $group: {
                _id: "$brandInfo._id",
                name: { $first: "$brandInfo.name" },
                slug: { $first: "$brandInfo.slug" },
              },
            },
          ],
          priceRanges: [
            {
              $group: {
                _id: null,
                minPrice: { $min: "$discountedPrice" },
                maxPrice: { $max: "$discountedPrice" },
              },
            },
          ],
        },
      },
    ];

    const [result] = await Product.aggregate(aggregationPipeline);

    const total = result.metadata[0]?.total || 0;
    const products = result.data;
    const allCategories = result.allCategories;
    const allBrands = result.allBrands;
    const priceRanges = result.priceRanges[0] || { minPrice: 0, maxPrice: 0 };

    const priceFilters = getPriceFilter([priceRanges]);

    const filters = {
      priceRanges: priceFilters,
      brands: allBrands,
      categories: allCategories,
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
      data: products.map((product) => ({
        ...product,
        totalReviews: product.totalReviews || 0,
        averageRating: product.averageRating
          ? Number(product.averageRating.toFixed(1))
          : 0,
        price: product.discountedPrice,
      })),
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

export const getProductAlmostExpired = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 12;
    const skip = (page - 1) * pageSize;

    const [total, products] = await Promise.all([
      Product.countDocuments({
        isAlmostExpired: true,
      }),
      Product.find({
        isAlmostExpired: true,
      })
        .populate({ path: "categories", select: "name" })
        .populate({ path: "brand", select: "name" })
        .sort({ expiry: 1 })
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
