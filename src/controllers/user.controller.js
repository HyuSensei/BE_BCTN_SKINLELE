import User from "../models/user.model.js";

export const getAllUser = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const { search } = req.query;
    const skip = (page - 1) * pageSize;

    let filter = {};
    if (search) {
      filter = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      };
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("name email avatar isActive")
        .skip(skip)
        .limit(pageSize)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / pageSize),
        totalUsers: total,
        pageSize,
      },
    });
  } catch (error) {
    console.error("Error in getAllUser:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách người dùng",
      error: error.message,
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, avatar, isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (avatar) user.avatar = avatar;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Cập nhật thông tin người dùng thành công",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Error in updateUser:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật thông tin người dùng",
      error: error.message,
    });
  }
};
