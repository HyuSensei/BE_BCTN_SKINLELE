import nodemailer from "nodemailer";
import fs from "fs";
import handlebars from "handlebars";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templatePath = path.resolve(
  __dirname,
  "..",
  "templates",
  "verificationEmailTemplate.html"
);

if (!fs.existsSync(templatePath)) {
  throw new Error(`Template file not found at ${templatePath}`);
}

const emailTemplate = fs.readFileSync(templatePath, "utf8");
const compiledTemplate = handlebars.compile(emailTemplate);

export const sendEmail = ({ email, name, verificationCode }) => {
  const htmlContent = compiledTemplate({
    name: name,
    verificationCode: verificationCode,
  });

  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mainOptions = {
    from: "Skinlele.vn",
    to: email,
    subject: "Xác thực OTP",
    template: "verify-otp",
    html: htmlContent,
  };

  transporter.sendMail(mainOptions, function (err, info) {
    if (err) {
      console.log("error while sending email, error: ", err);
    }
  });
};
