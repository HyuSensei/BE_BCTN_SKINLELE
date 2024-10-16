import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import connectDabase from "./configs/database.js";
import adminRoutes from "./routes/admins/index.js";
import userRoutes from "./routes/users/index.js";
import session from "express-session";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import { saveUser } from "./services/user.service.js";
import User from "./models/user.model.js";
import passport from "passport";
import { googleCallback } from "./controllers/auth.controller.js";
import { handleWebhookOrder } from "./controllers/order.controller.js";
import "./jobs/expired.js";
import "./jobs/opt.js";

dotenv.config();

const PORT = process.env.PORT || 8000;
const clientID = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

const app = express();

app.use(
  cors({
    origin: process.env.FRONT_END_URL,
    credentials: true,
  })
);

app.post(
  "/webhook-stripe",
  express.raw({ type: "application/json" }),
  handleWebhookOrder
);

app.use(cookieParser());
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new GoogleStrategy(
    {
      clientID,
      clientSecret,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      await saveUser(profile, done);
    }
  )
);

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get("/auth/google/callback", (req, res, next) => {
  passport.authenticate("google", (err, user, info) => {
    if (info && info.isExist) {
      return res.redirect(
        `${process.env.FRONT_END_URL}/auth?error=already_registered`
      );
    }
    if (err) {
      console.log(err);
      return res.redirect(
        `${process.env.FRONT_END_URL}/auth?error=server_error`
      );
    }
    if (!user) {
      return res.redirect(
        `${process.env.FRONT_END_URL}/auth?error=google_auth_failed`
      );
    }
    req.logIn(user, (err) => {
      if (err) {
        return res.redirect(
          `${process.env.FRONT_END_URL}/auth?error=login_error`
        );
      }
      googleCallback(req, res, next);
    });
  })(req, res, next);
});

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id).then((user) => {
    done(null, user);
  });
});

app.use("/api/v1", userRoutes);
app.use("/api/v1/admin", adminRoutes);

app.listen(PORT, async () => {
  await connectDabase();
  console.log(`🚀-------------SERVER RUN PORT ${PORT}-------------🚀`);
});
