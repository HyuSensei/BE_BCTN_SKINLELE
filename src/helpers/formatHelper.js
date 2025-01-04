export const formatHelper = {
  // Format trạng thái đơn hàng
  formatOrderStatus: (status) => {
    const statusMap = {
      pending: "Chờ xử lý",
      processing: "Đang xử lý",
      shipping: "Đang giao hàng",
      delivered: "Đã giao hàng",
      cancelled: "Đã hủy",
    };
    return statusMap[status] || status;
  },

  // Format phương thức thanh toán
  formatPaymentMethod: (method) => {
    const methodMap = {
      COD: "Tiền mặt",
      STRIPE: "Thẻ quốc tế",
      VNPAY: "VN Pay",
    };
    return methodMap[method] || method;
  },

  // Format ngày tháng
  formatDate: (date, format = "full") => {
    const d = new Date(date);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();

    switch (format) {
      case "date":
        return `${day} Tháng ${month}`;
      case "month":
        return `Tháng ${month}/${year}`;
      case "full":
        return `${day} Tháng ${month} Năm ${year}`;
      default:
        return `${day}/${month}/${year}`;
    }
  },

  // Format tiền tệ
  formatCurrency: (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  },
};
