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
    const { recipient, model, booking } = JSON.parse(data);
    const noti = await createNotiByBooking({ recipient, model, booking });
    
    socket.emit("resNewNotiFromBooking", noti);

    const receiverSockets = getAllSocketsForUser(booking.doctor);
    receiverSockets.forEach((socketId) => {
      io.to(socketId).emit("resNewNotiFromBooking", noti);
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
