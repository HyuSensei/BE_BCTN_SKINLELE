import Order from "../models/order.model.js";
import { ignoreLogger, ProductCode, VNPay, VnpLocale } from "vnpay";
import Stripe from "stripe";
import OrderSession from "../models/order-session.model.js";
import dotenv from "dotenv";
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
  try {
    const user = req.user;
    const {
      name,
      products,
      phone,
      address,
      province,
      district,
      ward,
      paymentMethod,
      totalAmount,
      note,
    } = req.body;
    const newOrder = new Order({
      user: user._id,
      name,
      products,
      phone,
      address,
      province,
      district,
      ward,
      paymentMethod,
      totalAmount,
      note: note ? note : "KHÔNG CÓ",
    });
    const savedOrder = await newOrder.save();
    res.status(201).json({
      success: true,
      message: "Đặt hàng thành công",
      data: savedOrder,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi đặt hàng",
      error: error.message,
    });
  }
};

export const createOrderVnpay = async (req, res) => {
  try {
    const user = req.user;
    const {
      name,
      products,
      phone,
      address,
      province,
      district,
      ward,
      paymentMethod,
      totalAmount,
      note,
    } = req.body;
    const newOrder = new Order({
      user: user._id,
      name,
      products,
      phone,
      address,
      province,
      district,
      ward,
      paymentMethod,
      totalAmount,
      note: note ? note : "KHÔNG CÓ",
    });
    const savedOrder = await newOrder.save();

    const ipAddr =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.ip;

    const paymentUrl = vnpay.buildPaymentUrl({
      vnp_Amount: savedOrder.totalAmount,
      vnp_IpAddr: ipAddr,
      vnp_TxnRef: savedOrder._id,
      vnp_OrderInfo: `Thanh toan cho ma GD: ${savedOrder._id}`,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: process.env.ORDER_RETURN_URL,
      vnp_Locale: VnpLocale.VN,
    });

    return res.status(200).json({
      success: true,
      data: paymentUrl,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi đặt hàng",
      error: error.message,
    });
  }
};

export const createOrderStripe = async (req, res) => {
  try {
    const user = req.user;
    const {
      name,
      products,
      phone,
      address,
      province,
      district,
      ward,
      paymentMethod,
      totalAmount,
      note,
    } = req.body;

    const dataCreate = new OrderSession({
      user: user._id,
      name,
      products,
      phone,
      address,
      province,
      district,
      ward,
      paymentMethod,
      totalAmount,
      note: note ? note : "KHÔNG CÓ",
    });
    const orderSession = await dataCreate.save();

    const lineItems = products.map((item) => ({
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

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      metadata: {
        orderId: JSON.stringify(orderSession._id),
      },
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.ORDER_RETURN_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.ORDER_RETURN_URL}?order_session=${orderSession._id}&session_id={CHECKOUT_SESSION_ID}`,
    });

    return res.status(200).json({
      success: true,
      id: session.id,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi đặt hàng",
      error: error.message,
    });
  }
};

const createOrderWebhook = async ({
  orderId,
  action,
  stripeSessionId = "",
}) => {
  const orderSession = await OrderSession.findById(orderId)
    .select("-__v -createdAt -updatedAt -_id")
    .lean();
  if (!orderSession) return;

  switch (action) {
    case "create":
      return await Promise.all([
        Order.create({
          ...orderSession,
          stripeSessionId,
        }),
        OrderSession.deleteOne({ _id: orderId }),
      ]);

    case "delete":
      return await OrderSession.deleteOne({ _id: orderId });

    default:
      break;
  }
};

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

  switch (event.type) {
    case "checkout.session.completed":
      const checkoutCompleted = event.data.object;
      return await createOrderWebhook({
        orderId: JSON.parse(checkoutCompleted.metadata.orderId),
        action: "create",
        stripeSessionId: checkoutCompleted.id,
      });

    case "checkout.session.async_payment_failed":
      const checkoutFailed = event.data.object;
      return await createOrderWebhook({
        orderId: JSON.parse(checkoutFailed.metadata.orderId),
        action: "delete",
      });

    case "checkout.session.expired":
      const checkoutExpired = event.data.object;
      return await createOrderWebhook({
        orderId: JSON.parse(checkoutExpired.metadata.orderId),
        action: "delete",
      });

    case "payment_intent.canceled":
      return await createOrderWebhook({
        orderId: JSON.parse(paymentCanceled.metadata.orderId),
        action: "delete",
      });

    default:
      break;
  }

  res.send();
};

export const orderVnpayReturn = async (req, res) => {
  try {
    const { orderId, code } = req.body;
    const order = await Order.findById(orderId).lean();

    if (!order || !orderId) {
      return res.status(404).json({
        success: false,
        message: "Thông tin đặt hàng không tồn tại",
      });
    }

    switch (code) {
      case "24":
        await Order.deleteOne({ _id: orderId });
        return res.status(402).json({
          success: false,
          message: "Giao dịch không thành công do: Khách hàng hủy giao dịch",
        });
      case "11":
        await Order.deleteOne({ _id: orderId });
        return res.status(402).json({
          success: false,
          message: "Giao dịch không thành công do: Khách hàng hủy giao dịch",
        });
      case "12":
        await Order.deleteOne({ _id: orderId });
        return res.status(402).json({
          success: false,
          message:
            "Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa",
        });
      case "75":
        await Order.deleteOne({ _id: orderId });
        return res.status(402).json({
          success: false,
          message: "Ngân hàng thanh toán đang bảo trì",
        });
      case "00":
        return res.status(200).json({
          success: true,
          message: "Thanh toán đơn hàng thành công",
          data: order,
        });
      default:
        await Order.deleteOne({ _id: orderId });
        return res.status(402).json({
          success: false,
          message: "Giao dịch không thành công",
        });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Thông tin đặt hàng không tồn tại",
      error: error.message,
    });
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
    res.status(500).json({
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
    res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái đơn hàng thành công",
      data: updatedOrder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi cập nhật trạng thái đơn hàng",
      error: error.message,
    });
  }
};

// export const getOrderByUser = async (req, res) => {
//   try {
//     const user = req.user;
//     const page = parseInt(req.query.page) || 1;
//     const pageSize = parseInt(req.query.pageSize) || 10;
//     const { status } = req.query;
//     const skip = (page - 1) * pageSize;

//     let statusCondition;
//     if (status === "pending") {
//       statusCondition = { $in: ["pending", "processing"] };
//     } else {
//       statusCondition = status;
//     }

//     const [orders, total] = await Promise.all([
//       Order.find({ user: user._id, status: statusCondition })
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(Number(pageSize)),
//       Order.countDocuments({ user: user._id, status: statusCondition }),
//     ]);

//     res.status(200).json({
//       success: true,
//       data: orders,
//       pagination: {
//         page: Number(page),
//         totalPage: Math.ceil(total / pageSize),
//         totalItems: total,
//         pageSize,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };

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
        statusCondition = { $in: ["pending", "processing", "shipping", "delivered", "cancelled"] };
    }

    const [orders, total, counts] = await Promise.all([
      Order.find({ user: user._id, status: statusCondition })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(pageSize)),
      Order.countDocuments({ user: user._id, status: statusCondition }),
      Order.aggregate([
        { $match: { user: user._id } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ])
    ]);

    const statusCounts = {
      pending: 0,
      processing: 0,
      shipping: 0,
      delivered: 0,
      cancelled: 0
    };

    counts.forEach(item => {
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
      statusCounts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
      data:[]
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
        { "user.name": { $regex: search, $options: "i" } },
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

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        page: Number(page),
        totalPage: Math.ceil(total / pageSize),
        totalItems: total,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
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
    res.status(200).json({
      success: true,
      message: "Xóa đơn hàng thành công",
      data: deletedOrder,
    });
  } catch (error) {
    res.status(500).json({
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
    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
