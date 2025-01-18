export const getReviewLookupStage = (reviewCollection) => ({
  $lookup: {
    from: reviewCollection,
    localField: "_id",
    foreignField:
      reviewCollection === "reviews"
        ? "product"
        : reviewCollection === "reviewdoctors"
        ? "doctor"
        : "clinic",
    pipeline: [{ $match: { isActive: true } }],
    as: "reviews",
  },
});

export const getReviewFieldsStage = () => ({
  $addFields: {
    totalReviews: { $size: "$reviews" },
    averageRating: {
      $cond: {
        if: { $gt: ["$totalReviews", 0] },
        then: {
          $round: [{ $avg: "$reviews.rate" }, 1],
        },
        else: 0,
      },
    },
    ratingDistribution: {
      $reduce: {
        input: "$reviews.rate",
        initialValue: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        in: {
          1: {
            $add: ["$$value.1", { $cond: [{ $eq: ["$$this", 1] }, 1, 0] }],
          },
          2: {
            $add: ["$$value.2", { $cond: [{ $eq: ["$$this", 2] }, 1, 0] }],
          },
          3: {
            $add: ["$$value.3", { $cond: [{ $eq: ["$$this", 3] }, 1, 0] }],
          },
          4: {
            $add: ["$$value.4", { $cond: [{ $eq: ["$$this", 4] }, 1, 0] }],
          },
          5: {
            $add: ["$$value.5", { $cond: [{ $eq: ["$$this", 5] }, 1, 0] }],
          },
        },
      },
    },
  },
});

export const getReviewProjectStage = () => ({
  $project: {
    reviews: 0,
  },
});

export const getRatingFilterStage = (minRating) => ({
  $match: {
    averageRating: { $gte: minRating },
  },
});

export const getRatingGroupStage = () => ({
  $group: {
    _id: null,
    averageRating: { $avg: "$averageRating" },
    totalReviews: { $sum: "$totalReviews" },
    ratingDistribution: {
      $reduce: {
        input: "$ratingDistribution",
        initialValue: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        in: {
          1: { $add: ["$$value.1", "$$this.1"] },
          2: { $add: ["$$value.2", "$$this.2"] },
          3: { $add: ["$$value.3", "$$this.3"] },
          4: { $add: ["$$value.4", "$$this.4"] },
          5: { $add: ["$$value.5", "$$this.5"] },
        },
      },
    },
  },
});

export const getReviewStats = (reviews = []) => {
  const totalReviews = reviews.length;

  if (totalReviews === 0) {
    return {
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      },
    };
  }

  const ratingDistribution = reviews.reduce(
    (acc, review) => {
      acc[review.rate] = (acc[review.rate] || 0) + 1;
      return acc;
    },
    { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  );

  const averageRating = Number(
    (
      reviews.reduce((sum, review) => sum + review.rate, 0) / totalReviews
    ).toFixed(1)
  );

  return {
    totalReviews,
    averageRating,
    ratingDistribution,
  };
};

export const getReviewLookupStagePro = () => ({
  $lookup: {
    from: "reviews",
    let: { productId: "$_id" },
    pipeline: [
      {
        $match: {
          $expr: { $eq: ["$product", "$$productId"] },
          display: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: "$userDetails" },
      {
        $project: {
          _id: 1,
          rate: 1,
          comment: 1,
          images: 1,
          reply: 1,
          createdAt: 1,
          user: {
            _id: "$userDetails._id",
            name: "$userDetails.name",
            avatar: "$userDetails.avatar",
          },
        },
      },
    ],
    as: "reviews",
  },
});

export const getReviewFieldsStagePro = () => ({
  $addFields: {
    totalReviews: { $size: "$reviews" },
    averageRating: {
      $cond: {
        if: { $gt: [{ $size: "$reviews" }, 0] },
        then: { $round: [{ $avg: "$reviews.rate" }, 1] },
        else: 0,
      },
    },
    ratingDistribution: {
      $reduce: {
        input: "$reviews.rate",
        initialValue: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        in: {
          1: { $add: ["$$value.1", { $cond: [{ $eq: ["$$this", 1] }, 1, 0] }] },
          2: { $add: ["$$value.2", { $cond: [{ $eq: ["$$this", 2] }, 1, 0] }] },
          3: { $add: ["$$value.3", { $cond: [{ $eq: ["$$this", 3] }, 1, 0] }] },
          4: { $add: ["$$value.4", { $cond: [{ $eq: ["$$this", 4] }, 1, 0] }] },
          5: { $add: ["$$value.5", { $cond: [{ $eq: ["$$this", 5] }, 1, 0] }] },
        },
      },
    },
  },
});
