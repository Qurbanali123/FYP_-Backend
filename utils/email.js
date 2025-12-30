import "dotenv/config";
import nodemailer from "nodemailer";

// 🔹 Check required env variables
if (
  !process.env.MAIL_HOST ||
  !process.env.MAIL_PORT ||
  !process.env.MAIL_USERNAME ||
  !process.env.MAIL_PASSWORD ||
  !process.env.MAIL_FROM_ADDRESS ||
  !process.env.MAIL_FROM_NAME
) {
  throw new Error("❌ Missing required SMTP environment variables");
}

// 🔹 Create Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: false, // false for STARTTLS (ports 587, 2525)
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: true,
  },
});

// 🔹 Verify SMTP connection
transporter.verify((err, success) => {
  if (err) console.error("❌ SMTP connection failed:", err);
  else console.log("✅ SMTP is ready to send emails");
});

// 🔹 Common sender
const FROM_EMAIL = `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`;

// 🔹 Helper to get recipient (TEST_EMAIL if defined)
const getRecipient = (email) => process.env.TEST_EMAIL || email;

// 🔹 Send OTP Email
export const sendOTPEmail = async (email, otp, userType) => {
  try {
    const recipientEmail = getRecipient(email);

    const subject =
      userType === "admin"
        ? "Admin Registration - Verify Your Email with OTP"
        : "Seller Registration - Verify Your Email with OTP";

    const htmlContent = `
      <h2>Email Verification</h2>
      <p>Your OTP for ${userType} registration is:</p>
      <h1 style="color:#007bff; letter-spacing:5px;">${otp}</h1>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    const textContent = `Your OTP for ${userType} registration is: ${otp}. It will expire in 10 minutes.`;

    await transporter.sendMail({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject,
      html: htmlContent,
      text: textContent,
    });

    return true;
  } catch (error) {
    console.error("❌ OTP Email error:", error);
    return false;
  }
};

// 🔹 Send Admin Approval Email
export const sendAdminApprovalEmail = async (superAdminEmail, newAdminData) => {
  try {
    const recipientEmail = getRecipient(superAdminEmail);

    const approveLink = `${process.env.ADMIN_DASHBOARD_URL}/admin/approve/${newAdminData.id}?action=approve`;
    const rejectLink = `${process.env.ADMIN_DASHBOARD_URL}/admin/approve/${newAdminData.id}?action=reject`;

    const htmlContent = `
      <h2>New Admin Registration Request</h2>
      <p>A new admin has registered and verified their email. Please review their details:</p>
      <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
        <tr style="background-color: #f2f2f2;">
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Name</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${newAdminData.name}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Email</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${newAdminData.email}</td>
        </tr>
      </table>
      <p style="margin-top:20px;">
        <a href="${approveLink}" style="padding:10px 20px; background:#28a745; color:white; text-decoration:none; border-radius:5px;">Approve</a>
        &nbsp;
        <a href="${rejectLink}" style="padding:10px 20px; background:#dc3545; color:white; text-decoration:none; border-radius:5px;">Reject</a>
      </p>
      <p style="margin-top:20px;">Or manage approvals in your Admin Dashboard.</p>
    `;

    const textContent = `New admin registration request:\nName: ${newAdminData.name}\nEmail: ${newAdminData.email}\nApprove: ${approveLink}\nReject: ${rejectLink}`;

    await transporter.sendMail({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject: "New Admin Registration Request",
      html: htmlContent,
      text: textContent,
    });

    return true;
  } catch (error) {
    console.error("❌ Admin Approval Email error:", error);
    return false;
  }
};

// 🔹 Send Password Reset Email
export const sendPasswordResetEmail = async (email, otp, userType) => {
  try {
    const recipientEmail = getRecipient(email);

    const subject =
      userType === "admin"
        ? "Password Reset - Verify with OTP"
        : "Password Reset Request - Verify with OTP";

    const htmlContent = `
      <h2>Password Reset Request</h2>
      <p>You have requested to reset your password. Your OTP is:</p>
      <h1 style="color:#007bff; letter-spacing:5px;">${otp}</h1>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    const textContent = `Your password reset OTP is: ${otp}. It will expire in 10 minutes.`;

    await transporter.sendMail({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject,
      html: htmlContent,
      text: textContent,
    });

    return true;
  } catch (error) {
    console.error("❌ Password Reset Email error:", error);
    return false;
  }
};

export default transporter;
