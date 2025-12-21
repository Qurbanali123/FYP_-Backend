import nodemailer from "nodemailer";

// Create transporter using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,           // smtp.gmail.com
  port: Number(process.env.EMAIL_PORT),   // 587
  secure: false,                          // true for 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,         // your Gmail
    pass: process.env.EMAIL_PASS          // Gmail App Password (16 chars)
  },
});

// ---------------- SEND OTP EMAIL ----------------
export const sendOTPEmail = async (to, otp, userType) => {
  try {
    const subject = userType === "admin"
      ? "Admin Registration - Verify Your Email with OTP"
      : "Seller Registration - Verify Your Email with OTP";

    const html = `
      <h2>Email Verification</h2>
      <p>Your OTP for ${userType} registration is:</p>
      <h1 style="color:#007bff; letter-spacing:5px;">${otp}</h1>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM, // Example: "FYP Backend <your_email@gmail.com>"
      to,
      subject,
      html
    });

    return true;
  } catch (error) {
    console.error("❌ Email sending error:", error);
    return false;
  }
};

// ---------------- PASSWORD RESET EMAIL ----------------
export const sendPasswordResetEmail = async (to, otp, userType) => {
  try {
    const subject = userType === "admin"
      ? "Password Reset - Verify with OTP"
      : "Password Reset Request - Verify with OTP";

    const html = `
      <h2>Password Reset Request</h2>
      <p>Your OTP is:</p>
      <h1 style="color:#007bff; letter-spacing:5px;">${otp}</h1>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you didn't request this, ignore this email.</p>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html
    });

    return true;
  } catch (error) {
    console.error("❌ Password reset email error:", error);
    return false;
  }
};

// ---------------- ADMIN APPROVAL EMAIL ----------------
export const sendAdminApprovalEmail = async (superAdminEmail, newAdminData) => {
  try {
    const approveLink = `${process.env.ADMIN_DASHBOARD_URL}/admin/approve/${newAdminData.id}?action=approve`;
    const rejectLink = `${process.env.ADMIN_DASHBOARD_URL}/admin/approve/${newAdminData.id}?action=reject`;

    const html = `
      <h2>New Admin Registration Request</h2>
      <p>A new admin has registered and verified their email:</p>
      <p><strong>Name:</strong> ${newAdminData.name}</p>
      <p><strong>Email:</strong> ${newAdminData.email}</p>
      <p>
        <a href="${approveLink}" style="background:#28a745;color:white;padding:10px 20px;border-radius:5px;text-decoration:none;margin-right:10px;">Approve</a>
        <a href="${rejectLink}" style="background:#dc3545;color:white;padding:10px 20px;border-radius:5px;text-decoration:none;">Reject</a>
      </p>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: superAdminEmail,
      subject: "New Admin Registration Request",
      html
    });

    return true;
  } catch (error) {
    console.error("❌ Admin approval email error:", error);
    return false;
  }
};

export default transporter;
