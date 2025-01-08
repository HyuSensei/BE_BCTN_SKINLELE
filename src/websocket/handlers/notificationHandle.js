import {
  createNotiByOrder,
  createNotiByUpdateStatusOrder,
} from "../../services/notification.service.js";
import { getAllSocketsForUser } from "../connectionManager.js";

export const handleNotificationEvents = (io, socket) => {
  socket.on("createOrder", async (data) => {
    const { recipient, model, order } = JSON.parse(data);
    const noti = await createNotiByOrder({ recipient, model, order });
    socket.emit("resCreateOrder", noti);
  });

  socket.on("updateOrderStatus", async (data) => {
    const { recipient, model, order } = JSON.parse(data);
    const noti = await createNotiByUpdateStatusOrder({
      recipient,
      model,
      order,
    });

    const receiverSockets = getAllSocketsForUser(recipient._id);
    receiverSockets.forEach((receiverSocket) => {
      receiverSocket.emit("resUpdateOrderStatus", noti);
    });
  });
};
