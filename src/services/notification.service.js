import Notification from "../models/notification.model.js";

export const createNotiByOrder = async ({ recipient, model, order }) => {
  try {
    const payload = {
      title: "🛍️ Đơn hàng mới",
      content: `Đơn hàng OD${order._id} đã được đặt thành công, SkinLeLe cảm ơn quý khách hàng ❤️`,
      metadata: {
        link: `/order-detail/${order._id}`,
      },
    };
    const noti = await Notification.create({ recipient, model, ...payload });

    return noti;
  } catch (error) {
    console.log("Error create notification order: ", error);
    return null;
  }
};

export const createNotiByUpdateStatusOrder = async ({
  recipient,
  model,
  order,
}) => {
  try {
    let title, content;

    switch (order.status) {
      case "processing":
        title = "🔄 Đơn hàng đang xử lý";
        content = `Đơn hàng OD${order._id} đang được xử lý, chúng tôi sẽ giao cho đơn vị vận chuyển trong thời gian sớm nhất.`;
        break;

      case "shipping":
        title = "🚚 Đơn hàng đang giao";
        content = `Đơn hàng OD${order._id} đã được giao cho đơn vị vận chuyển, vui lòng để ý điện thoại nhé!`;
        break;

      case "delivered":
        title = "✅ Đơn hàng đã giao";
        content = `Đơn hàng OD${order._id} đã giao thành công. Cảm ơn quý khách đã tin tưởng SkinLeLe ❤️`;
        break;

      case "cancelled":
        title = "❌ Đơn hàng đã hủy";
        content = `Đơn hàng OD${order._id} đã bị hủy. Lý do: ${order.cancelReason}`;
        break;

      default:
        return null;
    }

    const noti = await Notification.create({
      recipient,
      model,
      type: "STORE",
      title,
      content,
      metadata: {
        link: `/order-detail/${order._id}`,
      },
    });

    return noti;
  } catch (error) {
    console.log("Error create notification update order: ", error);
    return null;
  }
};

export const createNotiByBooking = async ({ recipient, model, booking }) => {
  try {
    const payload = {
      title: "🏥 Lịch khám mới",
      content: `Lịch khám BK${booking._id} đã được đặt thành công, cảm ơn quý khách đã tin tưởng ❤️`,
      type: "BOOKING",
      metadata: {
        link: `/booking-detail/${booking._id}`,
      },
    };
    const noti = await Notification.create({ recipient, model, ...payload });
    return noti;
  } catch (error) {
    console.log("Error create notification booking: ", error);
    return null;
  }
};

export const createNotiByUpdateStatusBooking = async ({
  recipient,
  model,
  booking,
}) => {
  try {
    let title, content;

    switch (booking.status) {
      case "confirmed":
        title = "✅ Xác nhận lịch khám";
        content = `Lịch khám BK${booking._id} đã được xác nhận. Vui lòng đến đúng giờ!`;
        break;

      case "completed":
        title = "🎉 Hoàn thành khám";
        content = `Lịch khám BK${booking._id} đã hoàn thành. Cảm ơn quý khách đã tin tưởng ❤️`;
        break;

      case "cancelled":
        title = "❌ Hủy lịch khám";
        content = `Lịch khám BK${booking._id} đã bị hủy. Lý do: ${booking.cancelReason}`;
        break;

      default:
        return null;
    }

    const noti = await Notification.create({
      recipient,
      model,
      type: "BOOKING", 
      title,
      content,
      metadata: {
        link: `/booking-detail/${booking._id}`,
      },
    });

    return noti;
  } catch (error) {
    console.log("Error create notification update booking: ", error);
    return null;
  }
};