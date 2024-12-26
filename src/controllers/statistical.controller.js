import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import Product from "../models/product.model.js";
import Booking from "../models/booking.model.js";
import ReviewDoctor from "../models/review-doctor.model.js";
import ReviewClinic from "../models/review-clinic.model.js";
import Doctor from "../models/doctor.model.js";
import { Types } from "mongoose";
import moment from "moment";
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
      { $limit: 5 },
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

    // Get total orders grouped by status
    const orderStatuses = await Order.aggregate([
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
          _id: "$status",
          orderCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          status: "$_id",
          orderCount: 1,
        },
      },
      {
        $group: {
          _id: null,
          statuses: {
            $push: {
              k: "$status",
              v: "$orderCount",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          statuses: 1,
        },
      },
      {
        $addFields: {
          statuses: {
            $concatArrays: [
              [
                { k: "pending", v: 0 },
                { k: "processing", v: 0 },
                { k: "shipping", v: 0 },
                { k: "delivered", v: 0 },
                { k: "cancelled", v: 0 },
              ],
              "$statuses",
            ],
          },
        },
      },
      {
        $project: {
          statuses: {
            $arrayToObject: "$statuses",
          },
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
        orderStatuses: orderStatuses[0]?.statuses,
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

export const getStatisticalDoctor = async (req, res) => {
  try {
    const { year = moment().year(), month = moment().month() + 1 } = req.query;
    const doctorId = req.user._id;

    const startDate = moment()
      .year(year)
      .month(month - 1)
      .startOf("month");
    const endDate = moment(startDate).endOf("month");
    const daysInMonth = endDate.date();

    const bookings = await Booking.find({
      doctor: doctorId,
      date: {
        $gte: startDate.toDate(),
        $lte: endDate.toDate(),
      },
    });

    const avgRating = await ReviewDoctor.aggregate([
      {
        $match: {
          doctor: doctorId,
          createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() },
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rate" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    let totalStats = {
      totalBookings: 0,
      totalSales: 0,
      revenue: 0,
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      completed: 0,
    };

    const dailyStats = Array.from({ length: daysInMonth }, (_, i) => ({
      day: `Ngày ${i + 1}`,
      totalBookings: 0,
      totalSales: 0,
      revenue: 0,
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      completed: 0,
    }));

    bookings.forEach((booking) => {
      const day = moment(booking.date).date();
      const dayIndex = day - 1;
      const bookingPrice = Number(booking.price);

      dailyStats[dayIndex].totalBookings++;
      dailyStats[dayIndex][booking.status]++;
      dailyStats[dayIndex].totalSales += bookingPrice;

      if (booking.status === "completed") {
        dailyStats[dayIndex].revenue += bookingPrice;
      }

      totalStats.totalBookings++;
      totalStats[booking.status]++;
      totalStats.totalSales += bookingPrice;

      if (booking.status === "completed") {
        totalStats.revenue += bookingPrice;
      }
    });

    const conversionRate =
      totalStats.completed > 0
        ? ((totalStats.completed / totalStats.totalBookings) * 100).toFixed(1)
        : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalStats: {
          ...totalStats,
          conversionRate: `${conversionRate}%`,
          revenueRate:
            totalStats.totalSales > 0
              ? `${((totalStats.revenue / totalStats.totalSales) * 100).toFixed(
                  1
                )}%`
              : "0%",
        },
        averageRating: avgRating[0]?.averageRating?.toFixed(1) || 0,
        totalReviews: avgRating[0]?.totalReviews || 0,
        stats: dailyStats.map((day) => ({
          ...day,
          conversionRate:
            day.totalBookings > 0
              ? `${((day.completed / day.totalBookings) * 100).toFixed(1)}%`
              : "0%",
          revenueRate:
            day.totalSales > 0
              ? `${((day.revenue / day.totalSales) * 100).toFixed(1)}%`
              : "0%",
        })),
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: error.message,
      data: {},
    });
  }
};

export const getClinicOverviewStats = async (req, res) => {
  try {
    const clinicId = new Types.ObjectId(`${req.params.clinicId}`);
    const { year = moment().year(), month = moment().month() + 1 } = req.query;

    const selectedDate = moment()
      .year(year)
      .month(month - 1);
    const startOfMonth = moment(selectedDate).startOf("month");
    const endOfMonth = moment(selectedDate).endOf("month");

    const [monthlyStats, doctorStats, reviewStats] = await Promise.all([
      Booking.aggregate([
        {
          $match: {
            clinic: clinicId,
            date: {
              $gte: startOfMonth.toDate(),
              $lte: endOfMonth.toDate(),
            },
          },
        },
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            // Doanh thu thực tế (chỉ từ booking completed)
            actualRevenue: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "completed"] },
                  { $toDouble: "$price" },
                  0,
                ],
              },
            },
            // Doanh số tiềm năng (tổng tất cả booking)
            potentialRevenue: { $sum: { $toDouble: "$price" } },
            pending: {
              $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
            },
            confirmed: {
              $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] },
            },
            cancelled: {
              $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
            },
            completed: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
            validBookings: {
              $sum: {
                $cond: [{ $ne: ["$status", "cancelled"] }, 1, 0],
              },
            },
          },
        },
        {
          $project: {
            totalBookings: 1,
            actualRevenue: 1,
            potentialRevenue: 1,
            pending: 1,
            confirmed: 1,
            cancelled: 1,
            completed: 1,
            validBookings: 1,
            completionRate: {
              $cond: [
                { $eq: ["$validBookings", 0] },
                0,
                {
                  $multiply: [
                    {
                      $divide: ["$completed", "$validBookings"],
                    },
                    100,
                  ],
                },
              ],
            },
          },
        },
      ]),

      Doctor.aggregate([
        {
          $match: {
            clinic: clinicId,
            isActive: true,
          },
        },
        {
          $group: {
            _id: null,
            totalDoctors: { $sum: 1 },
            specialties: { $addToSet: "$specialty" },
          },
        },
      ]),

      ReviewClinic.aggregate([
        {
          $match: {
            clinic: clinicId,
            createdAt: {
              $gte: startOfMonth.toDate(),
              $lte: endOfMonth.toDate(),
            },
          },
        },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rate" },
            totalReviews: { $sum: 1 },
          },
        },
      ]),
    ]);

    const bookingStats = monthlyStats[0] || {
      totalBookings: 0,
      actualRevenue: 0,
      potentialRevenue: 0,
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      completed: 0,
      completionRate: 0,
    };

    return res.status(200).json({
      success: true,
      data: {
        timeRange: {
          month: parseInt(month),
          year: parseInt(year),
        },
        bookings: {
          total: bookingStats.totalBookings,
          revenue: {
            actual: bookingStats.actualRevenue,
            potential: bookingStats.potentialRevenue,
          },
          status: {
            pending: bookingStats.pending,
            confirmed: bookingStats.confirmed,
            cancelled: bookingStats.cancelled,
            completed: bookingStats.completed,
          },
          completionRate: Number(bookingStats.completionRate.toFixed(1)),
        },
        doctors: {
          total: doctorStats[0]?.totalDoctors || 0,
          specialties: doctorStats[0]?.specialties || [],
        },
        reviews: {
          average: Number(reviewStats[0]?.averageRating?.toFixed(1)) || 0,
          total: reviewStats[0]?.totalReviews || 0,
        },
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thống kê tổng quan",
      error: error.message,
    });
  }
};

export const getClinicDetailedStats = async (req, res) => {
  try {
    const clinicId = new Types.ObjectId(`${req.params.clinicId}`);
    const { year = moment().year(), month = moment().month() + 1 } = req.query;

    const startDate = moment()
      .year(year)
      .month(month - 1)
      .startOf("month");
    const endDate = moment(startDate).endOf("month");

    const bookingChartData = await Booking.aggregate([
      {
        $match: {
          clinic: clinicId,
          date: {
            $gte: startDate.toDate(),
            $lte: endDate.toDate(),
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$date" },
          },
          totalBookings: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          confirmed: {
            $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] },
          },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
          actualRevenue: {
            $sum: {
              $cond: [
                { $eq: ["$status", "completed"] },
                { $toDouble: "$price" },
                0,
              ],
            },
          },
          potentialRevenue: { $sum: { $toDouble: "$price" } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const doctorChartData = await Booking.aggregate([
      {
        $match: {
          clinic: clinicId,
          date: {
            $gte: startDate.toDate(),
            $lte: endDate.toDate(),
          },
        },
      },
      {
        $lookup: {
          from: "doctors",
          localField: "doctor",
          foreignField: "_id",
          as: "doctorInfo",
        },
      },
      { $unwind: "$doctorInfo" },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            specialty: "$doctorInfo.specialty",
          },
          bookingCount: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.date",
          specialties: {
            $push: {
              name: "$_id.specialty",
              bookings: "$bookingCount",
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const reviewChartData = await ReviewClinic.aggregate([
      {
        $match: {
          clinic: clinicId,
          createdAt: {
            $gte: startDate.toDate(),
            $lte: endDate.toDate(),
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          averageRating: { $avg: "$rate" },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: "$rate",
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const daysInMonth = endDate.date();
    const fullTimeline = Array.from({ length: daysInMonth }, (_, index) => {
      const currentDate = moment(startDate).add(index, "days");
      const dateString = currentDate.format("YYYY-MM-DD");

      return {
        date: dateString,
        label: `Ngày ${currentDate.format("DD")}`,
      };
    });

    const bookingChart = fullTimeline.map((day) => {
      const bookingData = bookingChartData.find(
        (data) => data._id === day.date
      ) || {
        totalBookings: 0,
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        actualRevenue: 0,
        potentialRevenue: 0,
      };

      return {
        date: day.date,
        label: day.label,
        total: bookingData.totalBookings,
        pending: bookingData.pending,
        confirmed: bookingData.confirmed,
        completed: bookingData.completed,
        cancelled: bookingData.cancelled,
        revenue: {
          actual: bookingData.actualRevenue,
          potential: bookingData.potentialRevenue,
        },
      };
    });

    const doctorChart = fullTimeline.map((day) => {
      const doctorData = doctorChartData.find(
        (data) => data._id === day.date
      ) || {
        specialties: [],
      };

      return {
        date: day.date,
        label: day.label,
        specialties: doctorData.specialties,
      };
    });

    const reviewChart = fullTimeline.map((day) => {
      const reviewData = reviewChartData.find(
        (data) => data._id === day.date
      ) || {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: [],
      };

      const distribution =
        reviewData.ratingDistribution?.reduce((acc, rate) => {
          acc[rate] = (acc[rate] || 0) + 1;
          return acc;
        }, {}) || {};

      return {
        date: day.date,
        label: day.label,
        average: Number(reviewData.averageRating?.toFixed(1)) || 0,
        total: reviewData.totalReviews,
        distribution: {
          1: distribution["1"] || 0,
          2: distribution["2"] || 0,
          3: distribution["3"] || 0,
          4: distribution["4"] || 0,
          5: distribution["5"] || 0,
        },
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        timeRange: {
          year: parseInt(year),
          month: parseInt(month),
        },
        charts: {
          booking: bookingChart,
          doctor: doctorChart,
          review: reviewChart,
        },
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thống kê chi tiết",
      error: error.message,
    });
  }
};
