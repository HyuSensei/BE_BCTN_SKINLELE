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

export const createNotiByBooking = async ({ booking }) => {
  try {
    const payloadCustomer = {
      title: "🏥 Đặt lịch thành công",
      content: `Lịch khám BK${booking._id} đã được đặt thành công. Vui lòng chờ bác sĩ xác nhận!`,
      type: "BOOKING",
      metadata: {
        link: `/booking-detail/${booking._id}`,
      },
    };

    const payloadDoctor = {
      title: "🏥 Lịch khám mới",
      content: `Bạn có lịch khám mới BK${booking._id} từ ${booking.customer.name}`,
      type: "BOOKING",
      metadata: {
        link: `/doctor-owner?tab=bookings&id=${booking._id}`,
      },
    };

    const [notiCustomer, notiDoctor] = await Promise.all([
      Notification.create({
        recipient: booking.user,
        model: "User",
        ...payloadCustomer,
      }),
      Notification.create({
        recipient: booking.doctor._id,
        model: "Doctor",
        ...payloadDoctor,
      }),
    ]);
    return { notiCustomer, notiDoctor };
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
    let payload;

    if (model === "User") {
      switch (booking.status) {
        case "confirmed":
          payload = {
            title: "✅ Lịch khám được xác nhận",
            content: `Bác sĩ đã xác nhận lịch khám BK${booking._id}. Vui lòng đến đúng giờ!`,
            type: "BOOKING",
            metadata: {
              link: `/booking-detail/${booking._id}`,
            },
          };
          break;

        case "completed":
          payload = {
            title: "🎉 Hoàn thành khám",
            content: `Lịch khám BK${booking._id} đã hoàn thành. Cảm ơn bạn đã tin tưởng ❤️`,
            type: "BOOKING",
            metadata: {
              link: `/booking-detail/${booking._id}`,
            },
          };
          break;

        case "cancelled":
          if (booking.cancelReason) {
            payload = {
              title: "❌ Lịch khám bị hủy",
              content: `Lịch khám BK${booking._id} đã bị hủy. Lý do: ${booking.cancelReason}`,
              type: "BOOKING",
              metadata: {
                link: `/booking-detail/${booking._id}`,
              },
            };
          }
          break;
      }
    } else if (model === "Doctor" && booking.status === "cancelled") {
      payload = {
        title: "❌ Lịch khám bị hủy",
        content: `Bệnh nhân ${booking.customer.name} đã hủy lịch khám BK${booking._id}. Lý do: ${booking.cancelReason}`,
        type: "BOOKING",
        metadata: {
          link: `/doctor-owner?tab=bookings&id=${booking._id}`,
        },
      };
    }

    if (!payload) return null;

    const noti = await Notification.create({
      recipient,
      model,
      ...payload,
    });

    return noti;
  } catch (error) {
    console.log("Error create notification update booking: ", error);
    return null;
  }
};
