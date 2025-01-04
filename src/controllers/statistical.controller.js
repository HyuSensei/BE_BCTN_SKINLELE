import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import Product from "../models/product.model.js";
import Booking from "../models/booking.model.js";
import ReviewDoctor from "../models/review-doctor.model.js";
import ReviewClinic from "../models/review-clinic.model.js";
import Doctor from "../models/doctor.model.js";
import { Types } from "mongoose";
import moment from "moment";
import Review from "../models/review.model.js";
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

export const getOverviewStatistics = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || moment().year();
    const month = req.query.month ? parseInt(req.query.month) : null;
    let startDate, endDate;

    if (month) {
      startDate = moment()
        .year(year)
        .month(month - 1)
        .startOf("month");
      endDate = moment(startDate).endOf("month");
    } else {
      startDate = moment().year(year).startOf("year");
      endDate = moment(startDate).endOf("year");
    }

    const [orderStats, productStats, userStats, reviewStats] =
      await Promise.all([
        // Order Statistics
        Order.aggregate([
          {
            $match: {
              createdAt: {
                $gte: startDate.toDate(),
                $lte: endDate.toDate(),
              },
            },
          },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalAmount: { $sum: "$totalAmount" }, // Total sales
              revenue: {
                // Revenue from completed orders only
                $sum: {
                  $cond: [{ $eq: ["$status", "delivered"] }, "$totalAmount", 0],
                },
              },
              ordersByStatus: {
                $push: {
                  status: "$status",
                  amount: "$totalAmount",
                },
              },
            },
          },
        ]),

        // Product Statistics
        Product.aggregate([
          {
            $group: {
              _id: null,
              totalProducts: { $sum: 1 },
              almostExpired: {
                $sum: { $cond: ["$isAlmostExpired", 1, 0] },
              },
              expired: {
                $sum: { $cond: ["$isExpired", 1, 0] },
              },
            },
          },
        ]),

        // User Statistics
        User.aggregate([
          {
            $facet: {
              total: [{ $count: "count" }],
              active: [{ $match: { isActive: true } }, { $count: "count" }],
              new: [
                {
                  $match: {
                    createdAt: {
                      $gte: startDate.toDate(),
                      $lte: endDate.toDate(),
                    },
                  },
                },
                { $count: "count" },
              ],
            },
          },
        ]),

        // Review Statistics
        Review.aggregate([
          {
            $group: {
              _id: null,
              totalReviews: { $sum: 1 },
              averageRating: { $avg: "$rate" },
            },
          },
        ]),
      ]);

    // Process order status statistics
    const orderByStatus = {};
    if (orderStats[0]?.ordersByStatus) {
      orderStats[0].ordersByStatus.forEach((item) => {
        if (!orderByStatus[item.status]) {
          orderByStatus[item.status] = {
            count: 0,
            amount: 0,
          };
        }
        orderByStatus[item.status].count++;
        orderByStatus[item.status].amount += item.amount;
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        order: {
          total: orderStats[0]?.totalOrders || 0,
          totalAmount: orderStats[0]?.totalAmount || 0,
          revenue: orderStats[0]?.revenue || 0,
          status: orderByStatus,
        },
        product: {
          total: productStats[0]?.totalProducts || 0,
          almostExpired: productStats[0]?.almostExpired || 0,
          expired: productStats[0]?.expired || 0,
        },
        user: {
          total: userStats[0]?.total[0]?.count || 0,
          active: userStats[0]?.active[0]?.count || 0,
          new: userStats[0]?.new[0]?.count || 0,
        },
        review: {
          total: reviewStats[0]?.totalReviews || 0,
          averageRating: reviewStats[0]?.averageRating
            ? Number(reviewStats[0].averageRating.toFixed(1))
            : 0,
        },
      },
    });
  } catch (error) {
    console.error("Error get overview statistics:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getRevenueAndOrderStats = async (req, res) => {
  try {
    const { type = "date" } = req.query; // date, month, year
    const year = parseInt(req.query.year) || moment().year();
    const month = parseInt(req.query.month) || moment().month() + 1;

    let startDate, endDate, dateGroup;

    switch (type) {
      case "date":
        startDate = moment()
          .year(year)
          .month(month - 1)
          .startOf("month");
        endDate = moment()
          .year(year)
          .month(month - 1)
          .endOf("month");
        dateGroup = {
          day: { $dayOfMonth: "$createdAt" },
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" },
        };
        break;

      case "month":
        startDate = moment().year(year).startOf("year");
        endDate = moment().year(year).endOf("year");
        dateGroup = {
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" },
        };
        break;

      case "year":
        startDate = moment()
          .year(year - 4)
          .startOf("year");
        endDate = moment().year(year).endOf("year");
        dateGroup = {
          year: { $year: "$createdAt" },
        };
        break;
    }

    const stats = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate.toDate(),
            $lte: endDate.toDate(),
          },
        },
      },
      {
        $group: {
          _id: {
            ...dateGroup,
            status: "$status",
          },
          totalAmount: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    let formattedData = [];

    switch (type) {
      case "date":
        const daysInMonth = endDate.date();
        for (let i = 1; i <= daysInMonth; i++) {
          const dayStats = stats.filter(
            (item) =>
              item._id.day === i &&
              item._id.month === month &&
              item._id.year === year
          );

          formattedData.push({
            name: `${i}/${month}`,
            revenue:
              dayStats.find((s) => s._id.status === "delivered")?.totalAmount ||
              0,
            sales: dayStats.reduce((sum, s) => sum + s.totalAmount, 0),
            orders: dayStats.reduce((sum, s) => sum + s.count, 0),
            delivered:
              dayStats.find((s) => s._id.status === "delivered")?.count || 0,
            pending:
              dayStats.find((s) => s._id.status === "pending")?.count || 0,
            processing:
              dayStats.find((s) => s._id.status === "processing")?.count || 0,
            cancelled:
              dayStats.find((s) => s._id.status === "cancelled")?.count || 0,
          });
        }
        break;

      case "month":
        for (let i = 1; i <= 12; i++) {
          const monthStats = stats.filter(
            (item) => item._id.month === i && item._id.year === year
          );

          formattedData.push({
            name: `Tháng ${i}`,
            revenue:
              monthStats.find((s) => s._id.status === "delivered")
                ?.totalAmount || 0,
            sales: monthStats.reduce((sum, s) => sum + s.totalAmount, 0),
            orders: monthStats.reduce((sum, s) => sum + s.count, 0),
            delivered:
              monthStats.find((s) => s._id.status === "delivered")?.count || 0,
            pending:
              monthStats.find((s) => s._id.status === "pending")?.count || 0,
            processing:
              monthStats.find((s) => s._id.status === "processing")?.count || 0,
            cancelled:
              monthStats.find((s) => s._id.status === "cancelled")?.count || 0,
          });
        }
        break;

      case "year":
        for (let i = year - 4; i <= year; i++) {
          const yearStats = stats.filter((item) => item._id.year === i);

          formattedData.push({
            name: `Năm ${i}`,
            revenue:
              yearStats.find((s) => s._id.status === "delivered")
                ?.totalAmount || 0,
            sales: yearStats.reduce((sum, s) => sum + s.totalAmount, 0),
            orders: yearStats.reduce((sum, s) => sum + s.count, 0),
            delivered:
              yearStats.find((s) => s._id.status === "delivered")?.count || 0,
            pending:
              yearStats.find((s) => s._id.status === "pending")?.count || 0,
            processing:
              yearStats.find((s) => s._id.status === "processing")?.count || 0,
            cancelled:
              yearStats.find((s) => s._id.status === "cancelled")?.count || 0,
          });
        }
        break;
    }

    return res.status(200).json({
      success: true,
      data: {
        type,
        timeRange: {
          start: startDate.format("DD/MM/YYYY"),
          end: endDate.format("DD/MM/YYYY"),
        },
        stats: formattedData,
      },
    });
  } catch (error) {
    console.log("Error getting statistics", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getOrderStatistics = async (req, res) => {
  try {
    const { type = "date" } = req.query; // date, month, year
    const year = parseInt(req.query.year) || moment().year();
    const month = parseInt(req.query.month) || moment().month() + 1;

    let startDate, endDate, dateGroup;

    switch (type) {
      case "date":
        startDate = moment()
          .year(year)
          .month(month - 1)
          .startOf("month");
        endDate = moment()
          .year(year)
          .month(month - 1)
          .endOf("month");
        dateGroup = {
          day: { $dayOfMonth: "$createdAt" },
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" },
        };
        break;

      case "month":
        startDate = moment().year(year).startOf("year");
        endDate = moment().year(year).endOf("year");
        dateGroup = {
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" },
        };
        break;

      case "year":
        startDate = moment()
          .year(year - 4)
          .startOf("year");
        endDate = moment().year(year).endOf("year");
        dateGroup = {
          year: { $year: "$createdAt" },
        };
        break;
    }

    const [orderStats, paymentStats, areaStats] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate.toDate(),
              $lte: endDate.toDate(),
            },
          },
        },
        {
          $group: {
            _id: {
              ...dateGroup,
              status: "$status",
            },
            count: { $sum: 1 },
            total: { $sum: "$totalAmount" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
      ]),

      Order.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate.toDate(),
              $lte: endDate.toDate(),
            },
          },
        },
        {
          $group: {
            _id: "$paymentMethod",
            count: { $sum: 1 },
            total: { $sum: "$totalAmount" },
            completed: {
              $sum: {
                $cond: [{ $eq: ["$status", "delivered"] }, 1, 0],
              },
            },
            completedAmount: {
              $sum: {
                $cond: [{ $eq: ["$status", "delivered"] }, "$totalAmount", 0],
              },
            },
          },
        },
      ]),

      Order.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate.toDate(),
              $lte: endDate.toDate(),
            },
          },
        },
        {
          $group: {
            _id: "$province.name",
            orders: { $sum: 1 },
            total: { $sum: "$totalAmount" },
            delivered: {
              $sum: {
                $cond: [{ $eq: ["$status", "delivered"] }, 1, 0],
              },
            },
            cancelled: {
              $sum: {
                $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0],
              },
            },
          },
        },
        { $sort: { orders: -1 } },
        { $limit: 10 },
      ]),
    ]);

    // Format data theo từng type
    let formattedData = [];

    switch (type) {
      case "date":
        const daysInMonth = endDate.date();
        for (let i = 1; i <= daysInMonth; i++) {
          const dayData = orderStats.filter(
            (item) =>
              item._id.day === i &&
              item._id.month === month &&
              item._id.year === year
          );

          formattedData.push({
            name: `${i}/${month}`,
            pending:
              dayData.find((x) => x._id.status === "pending")?.count || 0,
            processing:
              dayData.find((x) => x._id.status === "processing")?.count || 0,
            shipping:
              dayData.find((x) => x._id.status === "shipping")?.count || 0,
            delivered:
              dayData.find((x) => x._id.status === "delivered")?.count || 0,
            cancelled:
              dayData.find((x) => x._id.status === "cancelled")?.count || 0,
            total: dayData.reduce((sum, item) => sum + item.count, 0),
            amount: dayData.reduce((sum, item) => sum + item.total, 0),
          });
        }
        break;

      case "month":
        for (let i = 1; i <= 12; i++) {
          const monthData = orderStats.filter(
            (item) => item._id.month === i && item._id.year === year
          );

          formattedData.push({
            name: `Tháng ${i}`,
            pending:
              monthData.find((x) => x._id.status === "pending")?.count || 0,
            processing:
              monthData.find((x) => x._id.status === "processing")?.count || 0,
            shipping:
              monthData.find((x) => x._id.status === "shipping")?.count || 0,
            delivered:
              monthData.find((x) => x._id.status === "delivered")?.count || 0,
            cancelled:
              monthData.find((x) => x._id.status === "cancelled")?.count || 0,
            total: monthData.reduce((sum, item) => sum + item.count, 0),
            amount: monthData.reduce((sum, item) => sum + item.total, 0),
          });
        }
        break;

      case "year":
        for (let i = year - 4; i <= year; i++) {
          const yearData = orderStats.filter((item) => item._id.year === i);

          formattedData.push({
            name: `${i}`,
            pending:
              yearData.find((x) => x._id.status === "pending")?.count || 0,
            processing:
              yearData.find((x) => x._id.status === "processing")?.count || 0,
            shipping:
              yearData.find((x) => x._id.status === "shipping")?.count || 0,
            delivered:
              yearData.find((x) => x._id.status === "delivered")?.count || 0,
            cancelled:
              yearData.find((x) => x._id.status === "cancelled")?.count || 0,
            total: yearData.reduce((sum, item) => sum + item.count, 0),
            amount: yearData.reduce((sum, item) => sum + item.total, 0),
          });
        }
        break;
    }

    // Calculate totals and percentages
    const totals = {
      orders: formattedData.reduce((sum, item) => sum + item.total, 0),
      amount: formattedData.reduce((sum, item) => sum + item.amount, 0),
      delivered: formattedData.reduce((sum, item) => sum + item.delivered, 0),
      cancelled: formattedData.reduce((sum, item) => sum + item.cancelled, 0),
    };

    totals.successRate = totals.orders
      ? ((totals.delivered / totals.orders) * 100).toFixed(2)
      : 0;
    totals.cancelRate = totals.orders
      ? ((totals.cancelled / totals.orders) * 100).toFixed(2)
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        timeStats: formattedData,
        paymentStats: paymentStats.map((item) => ({
          name: item._id,
          orders: item.count,
          total: item.total,
          completed: item.completed,
          completedAmount: item.completedAmount,
          successRate: ((item.completed / item.count) * 100).toFixed(2),
        })),
        areaStats,
        totals,
        timeRange: {
          start: startDate.format("DD/MM/YYYY"),
          end: endDate.format("DD/MM/YYYY"),
          type,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error getting order statistics",
      error: error.message,
    });
  }
};

export const getReviewStatistics = async (req, res) => {
  try {
    const { type = "date" } = req.query;
    const year = parseInt(req.query.year) || moment().year();
    const month = parseInt(req.query.month) || moment().month() + 1;

    let startDate, endDate, dateGroup;

    switch (type) {
      case "date":
        startDate = moment()
          .year(year)
          .month(month - 1)
          .startOf("month");
        endDate = moment()
          .year(year)
          .month(month - 1)
          .endOf("month");
        dateGroup = {
          day: { $dayOfMonth: "$createdAt" },
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" },
        };
        break;
      case "month":
        startDate = moment().year(year).startOf("year");
        endDate = moment().year(year).endOf("year");
        dateGroup = {
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" },
        };
        break;
      case "year":
        startDate = moment()
          .year(year - 4)
          .startOf("year");
        endDate = moment().year(year).endOf("year");
        dateGroup = {
          year: { $year: "$createdAt" },
        };
        break;
    }

    const [timeStats, productStats, ratingDistribution] = await Promise.all([
      // 1. Thống kê theo thời gian
      Review.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate.toDate(),
              $lte: endDate.toDate(),
            },
          },
        },
        {
          $group: {
            _id: dateGroup,
            count: { $sum: 1 },
            avgRating: { $avg: "$rate" },
            ratings: {
              $push: "$rate",
            },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
      ]),

      // 2. Thống kê theo sản phẩm
      Review.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate.toDate(),
              $lte: endDate.toDate(),
            },
          },
        },
        {
          $group: {
            _id: "$product",
            totalReviews: { $sum: 1 },
            avgRating: { $avg: "$rate" },
            ratings: {
              $push: "$rate",
            },
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
        {
          $project: {
            productName: "$product.name",
            totalReviews: 1,
            avgRating: 1,
            ratings: 1,
          },
        },
        { $sort: { totalReviews: -1 } },
        { $limit: 10 },
      ]),

      // 3. Phân bố điểm đánh giá
      Review.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate.toDate(),
              $lte: endDate.toDate(),
            },
          },
        },
        {
          $group: {
            _id: "$rate",
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
      ]),
    ]);

    // Format data theo từng type
    let formattedTimeStats = [];

    switch (type) {
      case "date":
        const daysInMonth = endDate.date();
        for (let i = 1; i <= daysInMonth; i++) {
          const dayData = timeStats.find(
            (item) =>
              item._id.day === i &&
              item._id.month === month &&
              item._id.year === year
          ) || { count: 0, avgRating: 0 };

          formattedTimeStats.push({
            name: `${i}/${month}`,
            total: dayData.count,
            avgRating: Number(dayData.avgRating?.toFixed(1)) || 0,
            ratingCounts:
              dayData.ratings?.reduce((acc, rate) => {
                acc[rate] = (acc[rate] || 0) + 1;
                return acc;
              }, {}) || {},
          });
        }
        break;

      case "month":
        for (let i = 1; i <= 12; i++) {
          const monthData = timeStats.find(
            (item) => item._id.month === i && item._id.year === year
          ) || { count: 0, avgRating: 0 };

          formattedTimeStats.push({
            name: `Tháng ${i}`,
            total: monthData.count,
            avgRating: Number(monthData.avgRating?.toFixed(1)) || 0,
            ratingCounts:
              monthData.ratings?.reduce((acc, rate) => {
                acc[rate] = (acc[rate] || 0) + 1;
                return acc;
              }, {}) || {},
          });
        }
        break;

      case "year":
        for (let i = year - 4; i <= year; i++) {
          const yearData = timeStats.find((item) => item._id.year === i) || {
            count: 0,
            avgRating: 0,
          };

          formattedTimeStats.push({
            name: `${i}`,
            total: yearData.count,
            avgRating: Number(yearData.avgRating?.toFixed(1)) || 0,
            ratingCounts:
              yearData.ratings?.reduce((acc, rate) => {
                acc[rate] = (acc[rate] || 0) + 1;
                return acc;
              }, {}) || {},
          });
        }
        break;
    }

    // Format product stats
    const formattedProductStats = productStats.map((product) => ({
      name: product.productName,
      total: product.totalReviews,
      avgRating: Number(product.avgRating.toFixed(1)),
      ratingCounts: product.ratings.reduce((acc, rate) => {
        acc[rate] = (acc[rate] || 0) + 1;
        return acc;
      }, {}),
    }));

    // Calculate totals
    const totals = {
      totalReviews: formattedTimeStats.reduce(
        (sum, item) => sum + item.total,
        0
      ),
      avgRating:
        Number(
          (
            formattedTimeStats.reduce(
              (sum, item) => sum + item.avgRating * item.total,
              0
            ) / formattedTimeStats.reduce((sum, item) => sum + item.total, 0)
          ).toFixed(1)
        ) || 0,
    };

    return res.status(200).json({
      success: true,
      data: {
        timeStats: formattedTimeStats,
        productStats: formattedProductStats,
        ratingDistribution: ratingDistribution.map((item) => ({
          rate: item._id,
          count: item.count,
          percentage: Number(
            ((item.count / totals.totalReviews) * 100).toFixed(1)
          ),
        })),
        totals,
        timeRange: {
          start: startDate.format("DD/MM/YYYY"),
          end: endDate.format("DD/MM/YYYY"),
          type,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error getting review statistics",
      error: error.message,
    });
  }
};
