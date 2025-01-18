export const calculateFinalPrice = (product) => {
  if (!product.promotion) {
    return product.price;
  }

  const { price } = product;
  const { discountPercentage = 0, maxDiscountAmount = 0 } = product.promotion;

  const discountAmount = (price * discountPercentage) / 100;

  const actualDiscount =
    maxDiscountAmount > 0
      ? Math.min(discountAmount, maxDiscountAmount)
      : discountAmount;

  const finalPrice = Math.round(price - actualDiscount);

  return finalPrice;
};

export const getPromotionLookupStage = (currentDate) => ({
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
});

export const getPromotionFieldsStage = () => ({
  $addFields: {
    promotionData: { $arrayElemAt: ["$promotionInfo", 0] },
    promotionProduct: { $arrayElemAt: ["$promotionInfo.products", 0] },
    isPromotion: { $gt: [{ $size: "$promotionInfo" }, 0] },
    price: "$price",
  },
});

export const getPromotionProjectStage = () => ({
  $project: {
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
    totalQuantity: 1,
    capacity: 1,
    price: 1,
    isPromotion: 1,
    promotion: {
      $cond: {
        if: "$isPromotion",
        then: {
          id: "$promotionData._id",
          name: "$promotionData.name",
          discountPercentage: {
            $convert: {
              input: {
                $ifNull: [
                  { $first: "$promotionProduct.discountPercentage" },
                  0,
                ],
              },
              to: "double",
            },
          },
          maxDiscountAmount: {
            $convert: {
              input: {
                $ifNull: [{ $first: "$promotionProduct.maxDiscountAmount" }, 0],
              },
              to: "double",
            },
          },
          startDate: "$promotionData.startDate",
          endDate: "$promotionData.endDate",
        },
        else: null,
      },
    },
  },
});

export const calulateFinalPricePipeline = {
  $addFields: {
    finalPrice: {
      $cond: {
        if: { $eq: [{ $type: "$promotion" }, "missing"] },
        then: "$price",
        else: {
          $let: {
            vars: {
              discountAmount: {
                $multiply: [
                  "$price",
                  { $divide: ["$promotion.discountPercentage", 100] },
                ],
              },
            },
            in: {
              $subtract: [
                "$price",
                {
                  $cond: {
                    if: { $gt: ["$promotion.maxDiscountAmount", 0] },
                    then: {
                      $min: [
                        "$$discountAmount",
                        "$promotion.maxDiscountAmount",
                      ],
                    },
                    else: "$$discountAmount",
                  },
                },
              ],
            },
          },
        },
      },
    },
  },
};
