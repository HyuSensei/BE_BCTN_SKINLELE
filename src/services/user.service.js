import User from "../models/user.model.js";

export const saveUser = async (profile, done) => {
  try {
    const existingUser = await User.findOne({
      email: profile.emails[0].value,
    });

    if (existingUser) {
      if (existingUser.isActive && !existingUser.googleId) {
        return done(null, false, {
          message: "Tài khoản đã tồn tại vui lòng thử lại",
          isExist: true,
        });
      }
      existingUser.googleId = profile.id;
      existingUser.avatar.url = profile.photos[0].value;
      existingUser.isActive = true;
      existingUser.name = profile.displayName;
      await existingUser.save();
      return done(null, existingUser);
    }
    const newUser = new User({
      googleId: profile.id,
      name: profile.displayName,
      email: profile.emails[0].value,
      avatar: {
        url: profile.photos[0].value,
        publicId: "",
      },
      password: "",
      isActive: true,
    });
    await newUser.save();
    done(null, newUser);
  } catch (error) {
    done(error, null);
  }
};
