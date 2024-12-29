import mongoose from "mongoose";

export const buildCategoryTree = (categories, parentId = null, level = 0) => {
  const categoryTree = [];

  categories
    .filter((category) =>
      parentId === null
        ? category.parent === null
        : category.parent && category.parent.toString() === parentId.toString()
    )
    .forEach((category) => {
      const nodeCategory = {
        _id: category._id,
        name: category.name,
        slug: category.slug,
        level: category.level,
        parent: category.parent,
      };

      const children = buildCategoryTree(categories, category._id, level + 1);
      if (children.length > 0) {
        nodeCategory.children = children;
      }
      categoryTree.push(nodeCategory);
    });

  return categoryTree;
};

export const getCategoryLookupStage = () => ({
  $lookup: {
    from: "categories",
    localField: "categories",
    foreignField: "_id",
    as: "categoriesInfo",
  },
});

export const getCategoryProjectStage = () => ({
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
});

export const getSubcategoriesAnalysisStage = () => ({
  $facet: {
    subcategories: [
      { $unwind: "$categoriesInfo" },
      {
        $group: {
          _id: "$categoriesInfo._id",
          name: { $first: "$categoriesInfo.name" },
          slug: { $first: "$categoriesInfo.slug" },
          productCount: { $sum: 1 },
        },
      },
      { $sort: { productCount: -1 } },
    ],
  },
});

export const parseCategoryIds = (categoriesList) => {
  if (!categoriesList) return [];
  return categoriesList
    .split(",")
    .filter((id) => id.trim())
    .map((id) => new mongoose.Types.ObjectId(`${id}`));
};

export const buildCategoryMatchStage = (categoryIds) => {
  if (!categoryIds) return {};

  const ids = Array.isArray(categoryIds) ? categoryIds : [categoryIds];
  return {
    categories: { $in: ids },
  };
};

export const getCategoryStatsStage = () => ({
  $group: {
    _id: "$categories",
    productCount: { $sum: 1 },
    avgRating: { $avg: "$averageRating" },
    priceRange: {
      min: { $min: "$price" },
      max: { $max: "$price" },
    },
  },
});
