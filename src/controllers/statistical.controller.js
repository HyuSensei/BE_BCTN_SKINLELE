import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import Product from "../models/product.model.js";
import moment from "moment-timezone";

moment.tz.setDefault("Asia/Ho_Chi_Minh");
export const getStatistics = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || moment().year();
    const month = req.query.month ? parseInt(req.query.month) : null;

    let startDate, endDate, timeUnit;
    const currentYear = moment().year();
    const yearStartDate = moment().year(currentYear).startOf("year");
    const yearEndDate = moment().year(currentYear).endOf("year");

    if (month) {
      // Monthly revenue statistics
      startDate = moment()
        .year(year)
        .month(month - 1)
        .startOf("month");
      endDate = moment(startDate).endOf("month");
      timeUnit = "day";
    } else {
      // Yearly revenue statistics
      startDate = moment().year(year).startOf("year");
      endDate = moment(startDate).endOf("year");
      timeUnit = "month";
    }

    // Fetch revenue statistics
    const revenueStats = await Promise.all(
      Array.from(
        { length: endDate.diff(startDate, timeUnit) + 1 },
        async (_, index) => {
          const start = moment(startDate).add(index, timeUnit);
          const end = moment(start).endOf(timeUnit);

          const orders = await Order.find({
            createdAt: { $gte: start.toDate(), $lte: end.toDate() },
          });

          const revenue = orders.reduce(
            (sum, order) => sum + order.totalAmount,
            0
          );
          const orderCount = orders.length;

          const stat = {
            month: start.format("MMM"),
            revenue,
            orderCount,
          };

          if (timeUnit === "day") {
            stat.day = start.format("DD");
          }

          return stat;
        }
      )
    );

    // Calculate totals for the current year
    const totalOrders = await Order.countDocuments({
      createdAt: { $gte: yearStartDate.toDate(), $lte: yearEndDate.toDate() },
    });
    const totalRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: yearStartDate.toDate(),
            $lte: yearEndDate.toDate(),
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmount" },
        },
      },
    ]).then((result) => result[0]?.total || 0);
    const totalCustomers = await User.countDocuments({
      createdAt: { $lte: yearEndDate.toDate() },
    });
    const totalProducts = await Product.countDocuments({
      createdAt: { $lte: yearEndDate.toDate() },
    });

    // Calculate top selling products for the current year
    const topSellingProducts = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: yearStartDate.toDate(),
            $lte: yearEndDate.toDate(),
          },
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

    return res.status(200).json({
      success: true,
      data: {
        yearlyStats: revenueStats,
        totals: {
          orders: totalOrders,
          revenue: totalRevenue,
          customers: totalCustomers,
          products: totalProducts,
        },
        topSellingProducts,
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
