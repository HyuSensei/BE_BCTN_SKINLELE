export const errorHandler = (err, req, res, next) => {
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((error) => error.message);
    return res.status(400).json({
      success: false,
      message: errors[0],
    });
  }

  console.error(err);
  return res.status(500).json({
    success: false,
    message: "Lỗi server",
    error: error.message,
  });
};
