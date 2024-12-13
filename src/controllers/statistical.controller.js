import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import Product from "../models/product.model.js";
import moment from "moment";
import Booking from "../models/booking.model.js";
import ReviewDoctor from "../models/review-doctor.model.js";
import ReviewClinic from "../models/review-clinic.model.js";
import Doctor from "../models/doctor.model.js";

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
      revenue: 0,
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      completed: 0,
    };

    // Modify the dailyStats to include "Ngày"
    const dailyStats = Array.from({ length: daysInMonth }, (_, i) => ({
      day: `Ngày ${i + 1}`, // Adding "Ngày" prefix
      totalBookings: 0,
      revenue: 0,
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      completed: 0,
    }));

    // Calculate stats
    bookings.forEach((booking) => {
      const day = moment(booking.date).date();
      const dayIndex = day - 1;

      // Update daily stats
      dailyStats[dayIndex].totalBookings++;
      dailyStats[dayIndex][booking.status]++;
      dailyStats[dayIndex].revenue += Number(booking.price);

      // Update total stats
      totalStats.totalBookings++;
      totalStats[booking.status]++;
      totalStats.revenue += Number(booking.price);
    });

    return res.status(200).json({
      success: true,
      data: {
        totalStats,
        averageRating: avgRating[0]?.averageRating?.toFixed(1) || 0,
        totalReviews: avgRating[0]?.totalReviews || 0,
        stats: dailyStats,
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

// API thống kê tổng quan
export const getClinicOverviewStats = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const today = moment().startOf("day");
    const startOfWeek = moment().startOf("week");
    const startOfMonth = moment().startOf("month");

    // Thống kê đặt lịch
    const [
      totalBookings,
      todayBookings,
      weeklyBookings,
      monthlyBookings,
      bookingsByStatus,
    ] = await Promise.all([
      Booking.countDocuments({ clinic: clinicId }),
      Booking.countDocuments({
        clinic: clinicId,
        date: {
          $gte: today.toDate(),
          $lt: moment(today).endOf("day").toDate(),
        },
      }),
      Booking.countDocuments({
        clinic: clinicId,
        date: {
          $gte: startOfWeek.toDate(),
          $lt: moment(startOfWeek).endOf("week").toDate(),
        },
      }),
      Booking.countDocuments({
        clinic: clinicId,
        date: {
          $gte: startOfMonth.toDate(),
          $lt: moment(startOfMonth).endOf("month").toDate(),
        },
      }),
      Booking.aggregate([
        { $match: { clinic: clinicId } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Thống kê bác sĩ và đánh giá
    const [doctorStats, clinicReviews, doctorReviews] = await Promise.all([
      Doctor.aggregate([
        { $match: { clinic: clinicId } },
        {
          $group: {
            _id: null,
            totalDoctors: { $sum: 1 },
            specialties: { $addToSet: "$specialty" },
          },
        },
      ]),
      ReviewClinic.aggregate([
        { $match: { clinic: clinicId } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rate" },
            totalReviews: { $sum: 1 },
            ratingDistribution: {
              $push: "$rate",
            },
          },
        },
      ]),
      ReviewDoctor.aggregate([
        {
          $lookup: {
            from: "doctors",
            localField: "doctor",
            foreignField: "_id",
            as: "doctorInfo",
          },
        },
        { $unwind: "$doctorInfo" },
        { $match: { "doctorInfo.clinic": clinicId } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rate" },
            totalReviews: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Xử lý phân bố rating
    const ratingDistribution = clinicReviews[0]?.ratingDistribution.reduce(
      (acc, rate) => {
        acc[rate] = (acc[rate] || 0) + 1;
        return acc;
      },
      { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    ) || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    // Xử lý trạng thái booking
    const bookingStatus = {
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      completed: 0,
    };
    bookingsByStatus.forEach((status) => {
      bookingStatus[status._id] = status.count;
    });

    return res.status(200).json({
      success: true,
      data: {
        bookings: {
          total: totalBookings,
          today: todayBookings,
          weekly: weeklyBookings,
          monthly: monthlyBookings,
          status: bookingStatus,
        },
        doctors: {
          total: doctorStats[0]?.totalDoctors || 0,
          specialties: doctorStats[0]?.specialties || [],
        },
        reviews: {
          clinic: {
            average: Number(clinicReviews[0]?.averageRating?.toFixed(1)) || 0,
            total: clinicReviews[0]?.totalReviews || 0,
            distribution: ratingDistribution,
          },
          doctors: {
            average: Number(doctorReviews[0]?.averageRating?.toFixed(1)) || 0,
            total: doctorReviews[0]?.totalReviews || 0,
          },
        },
      },
    });
  } catch (error) {
    console.error("Get clinic overview stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thống kê tổng quan",
      error: error.message,
    });
  }
};

// API thống kê chi tiết theo thời gian
export const getClinicDetailedStats = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const {
      startDate = moment().subtract(30, "days").format("YYYY-MM-DD"),
      endDate = moment().format("YYYY-MM-DD"),
      groupBy = "day", // day, week, month
    } = req.query;

    const start = moment(startDate).startOf("day");
    const end = moment(endDate).endOf("day");

    if (!start.isValid() || !end.isValid()) {
      return res.status(400).json({
        success: false,
        message: "Ngày không hợp lệ",
      });
    }

    // Thống kê booking theo thời gian
    const bookingStats = await Booking.aggregate([
      {
        $match: {
          clinic: clinicId,
          date: { $gte: start.toDate(), $lte: end.toDate() },
        },
      },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                {
                  case: { $eq: [groupBy, "week"] },
                  then: { $week: "$date" },
                },
                {
                  case: { $eq: [groupBy, "month"] },
                  then: { $month: "$date" },
                },
              ],
              default: {
                $dateToString: { format: "%Y-%m-%d", date: "$date" },
              },
            },
          },
          totalBookings: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
          revenue: {
            $sum: {
              $cond: [
                { $eq: ["$status", "completed"] },
                { $toDouble: "$price" },
                0,
              ],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Thống kê đánh giá theo thời gian
    const reviewStats = await ReviewClinic.aggregate([
      {
        $match: {
          clinic: clinicId,
          createdAt: { $gte: start.toDate(), $lte: end.toDate() },
        },
      },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                {
                  case: { $eq: [groupBy, "week"] },
                  then: { $week: "$createdAt" },
                },
                {
                  case: { $eq: [groupBy, "month"] },
                  then: { $month: "$createdAt" },
                },
              ],
              default: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
            },
          },
          averageRating: { $avg: "$rate" },
          totalReviews: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Tạo mảng các ngày trong khoảng thời gian
    const timeline = [];
    const current = moment(start);
    while (current <= end) {
      const timeKey =
        groupBy === "week"
          ? current.week()
          : groupBy === "month"
          ? current.month() + 1
          : current.format("YYYY-MM-DD");

      const bookingStat = bookingStats.find((stat) => stat._id === timeKey) || {
        totalBookings: 0,
        completed: 0,
        cancelled: 0,
        revenue: 0,
      };

      const reviewStat = reviewStats.find((stat) => stat._id === timeKey) || {
        averageRating: 0,
        totalReviews: 0,
      };

      timeline.push({
        time:
          groupBy === "week"
            ? `Tuần ${timeKey}`
            : groupBy === "month"
            ? `Tháng ${timeKey}`
            : timeKey,
        ...bookingStat,
        averageRating: Number(reviewStat.averageRating?.toFixed(1)) || 0,
        totalReviews: reviewStat.totalReviews || 0,
      });

      current.add(1, groupBy);
    }

    return res.status(200).json({
      success: true,
      data: {
        timeline,
        summary: {
          totalBookings: timeline.reduce(
            (sum, item) => sum + item.totalBookings,
            0
          ),
          totalCompleted: timeline.reduce(
            (sum, item) => sum + item.completed,
            0
          ),
          totalCancelled: timeline.reduce(
            (sum, item) => sum + item.cancelled,
            0
          ),
          totalRevenue: timeline.reduce((sum, item) => sum + item.revenue, 0),
          totalReviews: timeline.reduce(
            (sum, item) => sum + item.totalReviews,
            0
          ),
          averageRating:
            Number(
              (
                timeline.reduce(
                  (sum, item) => sum + item.averageRating * item.totalReviews,
                  0
                ) / timeline.reduce((sum, item) => sum + item.totalReviews, 0)
              ).toFixed(1)
            ) || 0,
        },
      },
    });
  } catch (error) {
    console.error("Get clinic detailed stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thống kê chi tiết",
      error: error.message,
    });
  }
};
