import Admin from "../models/admin.model.js";
import bcrypt from "bcryptjs";

export const createAccountAdmin = async (req, res) => {
  try {
    const { name, username, password, role, avatar } = req.body;

    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "Tên đăng nhập đã tồn tại",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 6 ký tự",
      });
    }

    const newAdmin = await Admin.create({
      name,
      username,
      password,
      role,
      avatar: avatar || {
        url: `https://avatar.iran.liara.run/username?username=${username}`,
        publicId: "",
      },
    });

    const adminWithoutPassword = newAdmin.toObject();
    delete adminWithoutPassword.password;

    return res.status(201).json({
      success: true,
      message: "Tạo tài khoản admin thành công",
      data: adminWithoutPassword,
    });
  } catch (error) {
    console.error("Create admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi tạo tài khoản admin",
      error: error.message,
    });
  }
};

// export const updateAccountAdmin = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const {
//       name,
//       username,
//       password,
//       role,
//       avatar,
//       isActive,
//       newPassword = "",
//     } = req.body;
//     const requestUser = req.admin;

//     const admin = await Admin.findById(id);
//     if (!admin) {
//       return res.status(404).json({
//         success: false,
//         message: "Không tìm thấy tài khoản admin",
//       });
//     }

//     if (username && username !== admin.username) {
//       const existingAdmin = await Admin.findOne({ username });
//       if (existingAdmin) {
//         return res.status(400).json({
//           success: false,
//           message: "Tên đăng nhập đã tồn tại",
//         });
//       }
//     }

//     const updateData = {
//       name: name || admin.name,
//       username: username || admin.username,
//       avatar: avatar || admin.avatar,
//     };

//     if (requestUser.role === "ADMIN") {
//       if (role) updateData.role = role;
//       if (typeof isActive === "boolean") updateData.isActive = isActive;
//     }

//     if (password) {
//       if (password.length < 6) {
//         return res.status(400).json({
//           success: false,
//           message: "Mật khẩu phải có ít nhất 6 ký tự",
//         });
//       }
//       updateData.password = await bcrypt.hash(password, 10);
//     }

//     const updatedAdmin = await Admin.findByIdAndUpdate(id, updateData, {
//       new: true,
//       runValidators: true,
//     }).select("-password");

//     return res.status(200).json({
//       success: true,
//       message: "Cập nhật tài khoản admin thành công",
//       data: updatedAdmin,
//     });
//   } catch (error) {
//     console.error("Update admin error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Lỗi khi cập nhật tài khoản admin",
//       error: error.message,
//     });
//   }
// };
export const updateAccountAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      username,
      password,
      role,
      avatar,
      isActive,
      newPassword = "",
    } = req.body;
    const requestUser = req.admin;

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản admin",
      });
    }

    if (username && username !== admin.username) {
      const existingAdmin = await Admin.findOne({ username });
      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: "Tên đăng nhập đã tồn tại",
        });
      }
    }

    const updateData = {
      name: name || admin.name,
      username: username || admin.username,
      avatar: avatar || admin.avatar,
    };

    if (requestUser.role === "ADMIN") {
      if (role) updateData.role = role;
      if (typeof isActive === "boolean") updateData.isActive = isActive;
    }

    if (newPassword) {
      if (!password) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập mật khẩu cũ để đổi mật khẩu mới",
        });
      }

      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Mật khẩu cũ không chính xác",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Mật khẩu mới phải có ít nhất 6 ký tự",
        });
      }

      updateData.password = await bcrypt.hash(newPassword, 10);
    } else if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Mật khẩu phải có ít nhất 6 ký tự",
        });
      }

      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    return res.status(200).json({
      success: true,
      message: "Cập nhật tài khoản admin thành công",
      data: updatedAdmin,
    });
  } catch (error) {
    console.error("Update admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật tài khoản admin",
      error: error.message,
    });
  }
};

export const removeAccountAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const requestUser = req.admin;

    if (requestUser._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa tài khoản của chính mình",
      });
    }

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản admin",
      });
    }

    if (admin.role === "ADMIN" && requestUser._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: "Không thể xóa tài khoản ADMIN khác",
      });
    }

    await Admin.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Xóa tài khoản admin thành công",
    });
  } catch (error) {
    console.error("Remove admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi xóa tài khoản admin",
      error: error.message,
    });
  }
};

export const getAllAccountAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      search = "",
      role,
      isActive,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    let filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ];
    }

    if (role) {
      filter.role = role.toUpperCase();
    }

    if (typeof isActive === "boolean") {
      filter.isActive = isActive;
    }

    const [admins, total] = await Promise.all([
      Admin.find(filter)
        .select("-password")
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      Admin.countDocuments(filter),
    ]);

    const roleStats = await Admin.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]);

    return res.status(200).json({
      success: true,
      data: admins,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPage: Math.ceil(total / pageSize),
        totalItems: total,
      },
      statistics: {
        roleDistribution: roleStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    console.error("Get all admins error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách admin",
      error: error.message,
    });
  }
};
