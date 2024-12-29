export const baseProductFields = {
  _id: 1,
  name: 1,
  slug: 1,
  mainImage: 1,
  images: 1,
  description: 1,
  price: 1,
  enable: 1,
  tags: 1,
  variants: 1,
  capacity: 1,
};

export const promotionFields = {
  finalPrice: 1,
  isPromotion: 1,
  promotion: {
    $cond: {
      if: "$isPromotion",
      then: {
        id: "$promotionData._id",
        name: "$promotionData.name",
        discountPercentage: {
          $ifNull: [
            { $arrayElemAt: ["$promotionProduct.discountPercentage", 0] },
            0,
          ],
        },
        maxDiscountAmount: {
          $ifNull: [
            { $arrayElemAt: ["$promotionProduct.maxDiscountAmount", 0] },
            0,
          ],
        },
        startDate: "$promotionData.startDate",
        endDate: "$promotionData.endDate",
      },
      else: null,
    },
  },
};

export const categoryFields = {
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
};

export const brandFields = {
  brand: {
    _id: "$brandInfo._id",
    name: "$brandInfo.name",
    slug: "$brandInfo.slug",
  },
};

export const reviewFields = {
  totalReviews: 1,
  averageRating: 1,
  ratingDistribution: 1,
};

export const getFullProjectStage = (additionalFields = {}) => ({
  $project: {
    ...baseProductFields,
    ...promotionFields,
    ...categoryFields,
    ...brandFields,
    ...reviewFields,
    ...additionalFields,
  },
});

export const getBasicProjectStage = (additionalFields = {}) => ({
  $project: {
    ...baseProductFields,
    ...categoryFields,
    ...brandFields,
    ...additionalFields,
  },
});
