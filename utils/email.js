import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ---------------- SEND OTP EMAIL ----------------
export const sendOTPEmail = async (email, otp, userType) => {
  try {
    const subject =
      userType === "admin"
        ? "Admin Registration - Verify Your Email with OTP"
        : "Seller Registration - Verify Your Email with OTP";

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      html: `
        <h2>Email Verification</h2>
        <p>Your OTP for ${userType} registration is:</p>
        <h1 style="color:#007bff; letter-spacing:5px;">${otp}</h1>
        <p>This OTP will expire in 10 minutes.</p>
      `,
    });

    return true;
  } catch (error) {
    console.error("❌ Email sending error:", error);
    return false;
  }
};

// ---------------- ADMIN APPROVAL EMAIL ----------------
export const sendAdminApprovalEmail = async (superAdminEmail, newAdminData) => {
  try {
    const approveLink = `${process.env.ADMIN_DASHBOARD_URL}/admin/approve/${newAdminData.id}?action=approve`;
    const rejectLink = `${process.env.ADMIN_DASHBOARD_URL}/admin/approve/${newAdminData.id}?action=reject`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: superAdminEmail,
      subject: "New Admin Registration Request",
      html: `
        <h2>New Admin Registration Request</h2>
        <p><strong>Name:</strong> ${newAdminData.name}</p>
        <p><strong>Email:</strong> ${newAdminData.email}</p>
        <a href="${approveLink}">Approve</a> |
        <a href="${rejectLink}">Reject</a>
      `,
    });

    return true;
  } catch (error) {
    console.error("❌ Admin approval email error:", error);
    return false;
  }
};

// ---------------- PASSWORD RESET EMAIL ----------------
export const sendPasswordResetEmail = async (email, otp, userType) => {
  try {
    const subject =
      userType === "admin"
        ? "Password Reset - Verify with OTP"
        : "Password Reset Request - Verify with OTP";

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      html: `
        <h2>Password Reset</h2>
        <h1>${otp}</h1>
        <p>OTP expires in 10 minutes.</p>
      `,
    });

    return true;
  } catch (error) {
    console.error("❌ Password reset email error:", error);
    return false;
  }
};

export default transporter;
