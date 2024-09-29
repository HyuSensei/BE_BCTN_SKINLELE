import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import Product from "../models/product.model.js";
import Review from "../models/review.model.js";
import moment from "moment-timezone";

export const getStatistics = async (req, res) => {
  try {
    const startOfYear = moment().tz("Asia/Ho_Chi_Minh").startOf("year");
    const endOfYear = moment().tz("Asia/Ho_Chi_Minh").endOf("year");

    // Fetch statistics for each month of the current year
    const monthlyStats = await Promise.all(
      Array.from({ length: 12 }, async (_, index) => {
        const startOfMonth = moment(startOfYear).add(index, "months");
        const endOfMonth = moment(startOfMonth).endOf("month");

        const orders = await Order.find({
          createdAt: { $gte: startOfMonth.toDate(), $lte: endOfMonth.toDate() },
        });

        const revenue = orders.reduce(
          (sum, order) => sum + order.totalAmount,
          0
        );
        const orderCount = orders.length;

        return {
          month: startOfMonth.format("MMM"),
          revenue,
          orderCount,
        };
      })
    );

    // Calculate totals for the year
    const totalOrders = await Order.countDocuments({
      createdAt: { $gte: startOfYear.toDate(), $lte: endOfYear.toDate() },
    });
    const totalRevenue = monthlyStats.reduce(
      (sum, stat) => sum + stat.revenue,
      0
    );
    const totalCustomers = await User.countDocuments({
      createdAt: { $lte: endOfYear.toDate() },
    });
    const totalProducts = await Product.countDocuments({
      createdAt: { $lte: endOfYear.toDate() },
    });

    // Calculate top selling products
    const topSellingProducts = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfYear.toDate(), $lte: endOfYear.toDate() },
        },
      },
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.productId",
          totalSold: { $sum: "$products.quantity" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 8 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $project: {
          name: "$productDetails.name",
          totalSold: 1,
        },
      },
    ]);

    // Calculate top reviewed products
    const topReviewedProducts = await Review.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfYear.toDate(), $lte: endOfYear.toDate() },
        },
      },
      {
        $group: {
          _id: "$product",
          reviewCount: { $sum: 1 },
          averageRating: { $avg: "$rate" },
        },
      },
      { $sort: { reviewCount: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $project: {
          id: "$productDetails._id",
          name: "$productDetails.name",
          image: "$productDetails.mainImage.url",
          reviewCount: 1,
          averageRating: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        yearlyStats: monthlyStats,
        totals: {
          orders: totalOrders,
          revenue: totalRevenue,
          customers: totalCustomers,
          products: totalProducts,
        },
        topSellingProducts,
        topReviewedProducts,
      },
    });
  } catch (error) {
    console.log("Error fetching statistics", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      data: {},
    });
  }
};
