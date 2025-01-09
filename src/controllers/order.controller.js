import Order from "../models/order.model.js";
import { ignoreLogger, ProductCode, VNPay, VnpLocale } from "vnpay";
import Stripe from "stripe";
import OrderSession from "../models/order-session.model.js";
import dotenv from "dotenv";
import { updatePromotionAfterOrder } from "../services/promotion.service.js";
import mongoose from "mongoose";
import {
  calculateOrderAmount,
  restoreProductQuantity,
  updateInventory,
  validateOrder,
} from "../services/order.service.js";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const vnpay = new VNPay({
  tmnCode: process.env.TMN_CODE,
  secureSecret: process.env.SECURE_SECRET,
  vnpayHost: "https://sandbox.vnpayment.vn",
  testMode: true,
  hashAlgorithm: "SHA512",
  enableLog: true,
  loggerFn: ignoreLogger,
});

export const createOrderCod = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = req.user;
    const { name, products, phone, address, province, district, ward, note } =
      req.body;

    // Validate đơn hàng
    const validationErrors = await validateOrder(products);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: validationErrors[0] || "Đơn hàng không hợp lệ",
        errors: validationErrors,
      });
    }

    // Tính toán giá và xử lý sản phẩm
    const { totalAmount, products: processedProducts } =
      await calculateOrderAmount(products);

    // Tạo đơn hàng mới
    const newOrder = new Order({
      user,
      name,
      products: processedProducts,
      phone,
      address,
      province,
      district,
      ward,
      paymentMethod: "COD",
      totalAmount,
      note: note || "KHÔNG CÓ",
      statusHistory: [
        {
          status: "pending",
          updatedBy: user._id,
          updatedByModel: "User",
          date: new Date(),
        },
      ],
    });

    // Lưu đơn hàng
    await newOrder.save({ session });

    // Cập nhật số lượng sản phẩm
    await updateInventory(processedProducts, session);

    // Cập nhật thông tin khuyến mãi
    await updatePromotionAfterOrder(processedProducts);

    // Commit transaction
    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Đặt hàng thành công",
      data: newOrder,
    });
  } catch (error) {
    console.log("Error create order COD", error);
    await session.abortTransaction();
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi đặt hàng",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

export const createOrderVnpay = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = req.user._id;
    const { name, products, phone, address, province, district, ward, note } =
      req.body;

    // Validate đơn hàng
    const validationErrors = await validateOrder(products);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Đơn hàng không hợp lệ",
        errors: validationErrors,
      });
    }

    // Tính toán giá và xử lý sản phẩm
    const { totalAmount, products: processedProducts } =
      await calculateOrderAmount(products);

    // Tạo đơn hàng mới - chưa cập nhật inventory và promotion
    const newOrder = new Order({
      user,
      name,
      products: processedProducts,
      phone,
      address,
      province,
      district,
      ward,
      paymentMethod: "VNPAY",
      totalAmount,
      note: note || "KHÔNG CÓ",
      status: "pending",
      statusHistory: [
        {
          status: "pending",
          updatedBy: user._id,
          updatedByModel: "User",
          date: new Date(),
        },
      ],
    });

    await newOrder.save({ session });

    // Lấy IP của người dùng
    const ipAddr =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.ip;

    // Tạo URL thanh toán VNPay
    const paymentUrl = vnpay.buildPaymentUrl({
      vnp_Amount: newOrder.totalAmount,
      vnp_IpAddr: ipAddr,
      vnp_TxnRef: newOrder._id,
      vnp_OrderInfo: `Thanh toan don hang: ${newOrder._id}`,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: process.env.ORDER_RETURN_URL,
      vnp_Locale: VnpLocale.VN,
    });

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      data: paymentUrl,
    });
  } catch (error) {
    await session.abortTransaction();
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi tạo đơn hàng",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

export const orderVnpayReturn = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId, code } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin đơn hàng",
      });
    }

    let result;

    switch (code) {
      // Thanh toán thành công
      case "00": {
        // Cập nhật inventory
        await updateInventory(order.products, session);

        // Cập nhật promotion
        await updatePromotionAfterOrder(order.products);

        await session.commitTransaction();

        result = {
          success: true,
          message: "Thanh toán đơn hàng thành công",
          data: order,
        };
        break;
      }

      // Các trường hợp hủy hoặc thất bại
      case "24": {
        await Order.deleteOne({ _id: orderId }, { session });
        await session.commitTransaction();

        result = {
          success: false,
          message: "Giao dịch không thành công do: Khách hàng hủy giao dịch",
        };
        break;
      }

      case "11": {
        await Order.deleteOne({ _id: orderId }, { session });
        await session.commitTransaction();

        result = {
          success: false,
          message: "Giao dịch không thành công do: Khách hàng hủy giao dịch",
        };
        break;
      }

      case "12": {
        await Order.deleteOne({ _id: orderId }, { session });
        await session.commitTransaction();

        result = {
          success: false,
          message:
            "Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa",
        };
        break;
      }

      case "75": {
        await Order.deleteOne({ _id: orderId }, { session });
        await session.commitTransaction();

        result = {
          success: false,
          message: "Ngân hàng thanh toán đang bảo trì",
        };
        break;
      }

      default: {
        await Order.deleteOne({ _id: orderId }, { session });
        await session.commitTransaction();

        result = {
          success: false,
          message: "Giao dịch không thành công",
        };
        break;
      }
    }

    return res.status(result.success ? 200 : 402).json(result);
  } catch (error) {
    await session.abortTransaction();
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi xử lý kết quả thanh toán",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

export const createOrderStripe = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = req.user;
    const { name, products, phone, address, province, district, ward, note } =
      req.body;

    // Validate đơn hàng
    const validationErrors = await validateOrder(products);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Đơn hàng không hợp lệ",
        errors: validationErrors,
      });
    }

    // Tính toán giá và xử lý sản phẩm
    const { totalAmount, products: processedProducts } =
      await calculateOrderAmount(products);

    // Tạo đơn hàng tạm thời
    const orderSessionData = {
      user,
      name,
      products: processedProducts,
      phone,
      address,
      province,
      district,
      ward,
      paymentMethod: "STRIPE",
      totalAmount,
      note: note || "KHÔNG CÓ",
      statusHistory: [
        {
          status: "pending",
          updatedBy: user._id,
          updatedByModel: "User",
          date: new Date(),
        },
      ],
    };

    const orderSession = await OrderSession.create([orderSessionData], {
      session,
    });

    // Tạo line items cho Stripe
    const lineItems = processedProducts.map((item) => ({
      price_data: {
        currency: "vnd",
        product_data: {
          name: item.name,
          images: [item.image],
          metadata: {
            id: item.productId,
          },
        },
        unit_amount: item.price,
      },
      quantity: item.quantity,
    }));

    // Tạo Stripe session
    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      metadata: {
        orderId: JSON.stringify(orderSession[0]._id),
      },
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.ORDER_RETURN_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.ORDER_RETURN_URL}?order_session=${orderSession[0]._id}&session_id={CHECKOUT_SESSION_ID}`,
    });

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      id: stripeSession.id,
    });
  } catch (error) {
    await session.abortTransaction();
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi tạo đơn hàng",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// Webhook xử lý khi thanh toán Stripe thành công
export const handleWebhookOrder = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.END_POINT_SECRET
    );
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutCompleted = event.data.object;
        const orderSessionId = JSON.parse(checkoutCompleted.metadata.orderId);

        // Lấy thông tin đơn hàng tạm thời
        const orderSession = await OrderSession.findById(orderSessionId);
        if (!orderSession) {
          throw new Error("Không tìm thấy thông tin đơn hàng tạm thời");
        }

        // Tạo đơn hàng chính thức
        const orderData = orderSession.toObject();
        delete orderData._id;
        orderData.stripeSessionId = checkoutCompleted.id;

        const order = new Order(orderData);
        await order.save({ session });

        // Cập nhật inventory
        await updateInventory(orderData.products, session);

        // Cập nhật promotion
        await updatePromotionAfterOrder(orderData.products);

        // Xóa đơn hàng tạm thời
        await OrderSession.findByIdAndDelete(orderSessionId, { session });
        break;
      }

      case "checkout.session.expired":
      case "payment_intent.payment_failed": {
        const sessionData = event.data.object;
        const orderSessionId = JSON.parse(sessionData.metadata.orderId);

        // Xóa đơn hàng tạm thời
        await OrderSession.findByIdAndDelete(orderSessionId, { session });
        break;
      }
    }

    await session.commitTransaction();
    res.json({ received: true });
  } catch (error) {
    await session.abortTransaction();
    console.error("Webhook error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

export const orderStripeReturn = async (req, res) => {
  try {
    const { stripeSessionId, orderSessionId } = req.query;

    if (!stripeSessionId && !orderSessionId) {
      return res.status(400).json({
        success: false,
        message: "Đã xảy ra lỗi khi xử lý thông tin đặt hàng",
      });
    }

    if (stripeSessionId && !orderSessionId) {
      const order = await Order.findOne({ stripeSessionId }).lean();
      if (order) {
        return res.status(200).json({
          success: true,
          message: "Thanh toán đơn hàng thành công",
          data: order,
        });
      }
    }

    if (orderSessionId) {
      await OrderSession.deleteOne({ _id: orderSessionId });
    }

    return res.status(404).json({
      success: false,
      message: "Thanh toán Stripe thất bại, vui lòng thử lại",
    });
  } catch (error) {
    console.error("Lỗi xử lý đơn hàng Stripe:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi xử lý thông tin đặt hàng",
      error: error.message,
    });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updatedOrder = await Order.findByIdAndUpdate(id, data, { new: true });

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: "Đơn hàng không tồn tại",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cập nhật đơn hàng thành công",
      data: updatedOrder,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi cập nhật trạng thái đơn hàng",
      error: error.message,
    });
  }
};

export const updateOrderByUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const { name, province, district, ward, phone, address } = req.body;
    const order = await Order.findOne({
      _id: id,
      user: user._id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Đơn hàng không tồn tại",
      });
    }

    Object.assign(order, {
      ...(name && { name }),
      ...(province?.id && { province }),
      ...(district?.id && { district }),
      ...(ward?.id && { ward }),
      ...(phone && { phone }),
      ...(address && { address }),
    });

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Cập nhật đơn hàng thành công",
      data: order,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi cập nhật đơn hàng",
      error: error.message,
    });
  }
};

export const getOrderByUser = async (req, res) => {
  try {
    const user = req.user;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const { status } = req.query;
    const skip = (page - 1) * pageSize;

    let statusCondition;
    switch (status) {
      case "pending":
        statusCondition = "pending";
        break;
      case "processing":
        statusCondition = "processing";
        break;
      case "shipping":
        statusCondition = "shipping";
        break;
      case "delivered":
        statusCondition = "delivered";
        break;
      case "cancelled":
        statusCondition = "cancelled";
        break;
      default:
        statusCondition = {
          $in: ["pending", "processing", "shipping", "delivered", "cancelled"],
        };
    }

    const [orders, total, counts] = await Promise.all([
      Order.find({ user: user._id, status: statusCondition })
        .populate({
          path: "statusHistory.updatedBy",
          select: "name",
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(pageSize)),
      Order.countDocuments({ user: user._id, status: statusCondition }),
      Order.aggregate([
        { $match: { user: user._id } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const statusCounts = {
      pending: 0,
      processing: 0,
      shipping: 0,
      delivered: 0,
      cancelled: 0,
    };

    counts.forEach((item) => {
      statusCounts[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        page: Number(page),
        totalPage: Math.ceil(total / pageSize),
        totalItems: total,
        pageSize,
      },
      statusCounts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
      data: [],
    });
  }
};

export const getOrderByAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const { status, paymentMethod, fromDate, toDate, search } = req.query;
    const skip = (page - 1) * pageSize;
    let filter = {};

    if (status) {
      filter.status = status;
    }

    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    if (fromDate && toDate) {
      filter.createdAt = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate),
      };
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { "user.email": { $regex: search, $options: "i" } },
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(pageSize))
        .populate("user", "name email"),
      Order.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        page,
        totalPage: Math.ceil(total / pageSize),
        pageSize,
        totalItems: total,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).populate("user", "name email");
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Đơn hàng không tồn tại",
      });
    }
    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const updateStatusOrderByUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, cancelReason } = req.body;
    const user = req.user;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Đơn hàng không tồn tại",
      });
    }

    const allowedActions = {
      cancelled: ["pending", "processing"],
      pending: ["cancelled"],
      delivered: ["shipping"],
    };

    if (!allowedActions[status]?.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "Không thể thực hiện thao tác này",
      });
    }

    // Store the current status before any changes
    const currentStatus = order.status;

    if (status === "cancelled") {
      if (order.paymentMethod !== "COD") {
        return res.status(400).json({
          success: false,
          message: "Đơn hàng đã thanh toán không thể hủy",
        });
      }

      if (!cancelReason?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng cung cấp lý do hủy đơn hàng",
        });
      }

      const restoreResult = await restoreProductQuantity(order.products);
      if (!restoreResult.success) {
        return res.status(400).json({
          success: false,
          message: "Không thể hoàn lại số lượng sản phẩm",
        });
      }

      order.cancelReason = cancelReason.trim();
      order.status = "cancelled";
      order.statusHistory.push({
        prevStatus: currentStatus,
        status: "cancelled",
        updatedBy: user._id,
        updatedByModel: "User",
        date: new Date(),
      });
    } else if (status === "pending") {
      order.cancelReason = "";
      order.status = "pending";
      order.statusHistory.push({
        prevStatus: currentStatus,
        status: "pending",
        updatedBy: user._id,
        updatedByModel: "User",
        date: new Date(),
      });
    } else if (status === "delivered") {
      order.status = "delivered";
      order.statusHistory.push({
        prevStatus: currentStatus,
        status: "delivered",
        updatedBy: user._id,
        updatedByModel: "User",
        date: new Date(),
      });
    }

    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate("user", "name email")
      .populate({
        path: "statusHistory.updatedBy",
        select: "name email",
        model: mongoose.model("User"),
      });

    let message = "";
    switch (status) {
      case "cancelled":
        message = "Hủy đơn hàng thành công";
        break;
      case "pending":
        message = "Đặt lại đơn hàng thành công";
        break;
      case "delivered":
        message = "Xác nhận đã nhận hàng thành công";
        break;
      default:
        message = "Cập nhật trạng thái đơn hàng thành công";
    }

    return res.status(200).json({
      success: true,
      message,
      data: populatedOrder,
    });
  } catch (error) {
    console.error("Update order error:", error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi cập nhật đơn hàng",
      error: error.message,
    });
  }
};

export const updateStatusOrderByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, cancelReason } = req.body;
    const admin = req.admin;

    const order = await Order.findById(id).populate("user", "name email");
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    // Store the current status before any changes
    const prevStatus = order.status;

    if (order.status === "delivered" || order.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message:
          "Không thể thay đổi trạng thái đơn hàng đã hoàn thành hoặc đã hủy",
      });
    }

    const validTransitions = {
      pending: ["processing", "cancelled"],
      processing: ["shipping", "cancelled"],
      shipping: ["delivered", "cancelled"],
    };

    if (
      status !== "cancelled" &&
      !validTransitions[order.status]?.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: `Không thể chuyển trạng thái từ ${order.status} sang ${status}`,
      });
    }

    switch (status) {
      case "cancelled":
        if (!cancelReason?.trim()) {
          return res.status(400).json({
            success: false,
            message: "Vui lòng cung cấp lý do hủy đơn hàng",
          });
        }

        if (["pending", "processing"].includes(order.status)) {
          const restoreResult = await restoreProductQuantity(order.products);
          if (!restoreResult.success) {
            return res.status(400).json({
              success: false,
              message: "Không thể hoàn lại số lượng sản phẩm",
            });
          }
        }

        order.cancelReason = cancelReason.trim();
        break;
    }

    order.status = status;
    order.statusHistory.push({
      prevStatus,
      status,
      updatedBy: admin._id,
      updatedByModel: "Admin",
      date: new Date(),
    });

    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate("user", "name email")
      .populate({
        path: "statusHistory.updatedBy",
        select: "name username",
        model: mongoose.model("Admin"),
      });

    return res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái đơn hàng thành công",
      data: populatedOrder,
    });
  } catch (error) {
    console.error("Update order status error:", error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi cập nhật trạng thái đơn hàng",
      error: error.message,
    });
  }
};

export const removeOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedOrder = await Order.findByIdAndDelete(id);

    if (!deletedOrder) {
      return res.status(404).json({
        success: false,
        message: "Đơn hàng không tồn tại",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Xóa đơn hàng thành công",
      data: deletedOrder,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Có lỗi khi xóa đơn hàng",
      error: error.message,
    });
  }
};

export const getOrderDetailByUser = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const order = await Order.findOne({
      _id: id,
      user: user._id,
    }).populate({
      path: "statusHistory.updatedBy",
      select: "name",
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        data: null,
        message: "Không tìm thấy đơn hàng",
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.log("Error get order detail", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
