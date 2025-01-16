import {
  createNotiByBooking,
  createNotiByOrder,
  createNotiByUpdateStatusBooking,
  createNotiByUpdateStatusOrder,
} from "../../services/notification.service.js";
import { getAllSocketsForUser } from "../connectionManager.js";

export const handleNotificationEvents = (io, socket) => {
  socket.on("createOrder", async (data) => {
    const { recipient, model, order } = JSON.parse(data);
    const noti = await createNotiByOrder({ recipient, model, order });
    socket.emit("resNewNotiFromStore", noti);
  });

  socket.on("updateOrderStatus", async (data) => {
    const { recipient, model, order } = JSON.parse(data);
    const noti = await createNotiByUpdateStatusOrder({
      recipient,
      model,
      order,
    });

    const receiverSockets = getAllSocketsForUser(recipient);
    receiverSockets.forEach((socketId) => {
      io.to(socketId).emit("resNewNotiFromStore", noti);
    });
  });

  socket.on("createBooking", async (data) => {
    const { booking } = JSON.parse(data);
    const { notiCustomer, notiDoctor } = await createNotiByBooking({ booking });
    socket.emit("resNewNotiFromBooking", notiCustomer);
    const receiverSockets = getAllSocketsForUser(booking.doctor._id);
    receiverSockets.forEach((socketId) => {
      io.to(socketId).emit("resNewNotiFromBooking", notiDoctor);
    });
  });

  socket.on("updateBookingStatus", async (data) => {
    const { recipient, model, booking } = JSON.parse(data);
    const noti = await createNotiByUpdateStatusBooking({
      recipient,
      model,
      booking,
    });

    const receiverSockets = getAllSocketsForUser(recipient);
    receiverSockets.forEach((socketId) => {
      io.to(socketId).emit("resNewNotiFromBooking", noti);
    });
  });
};
