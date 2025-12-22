import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// ---------------- SEND OTP EMAIL ----------------
export const sendOTPEmail = async (email, otp, userType) => {
  try {
    const subject =
      userType === "admin"
        ? "Admin Registration - Verify Your Email with OTP"
        : "Seller Registration - Verify Your Email with OTP";

    console.log("📧 Attempting to send OTP to:", email);
    console.log("🔑 API Key exists:", !!process.env.RESEND_API_KEY);
    console.log("📤 FROM email:", process.env.EMAIL_FROM);

    const response = await resend.emails.send({
      from: `Hype2Day <${process.env.EMAIL_FROM}>`,
      to: email,
      subject,
      html: `
        <h2>Email Verification</h2>
        <p>Your OTP for ${userType} registration is:</p>
        <h1 style="color:#007bff; letter-spacing:5px;">${otp}</h1>
        <p>This OTP will expire in 10 minutes.</p>
      `,
    });

    console.log("✅ Email sent successfully:", response);
    return true;
  } catch (error) {
    console.error("❌ Resend OTP email error:", error.message);
    console.error("❌ Full error:", error);
    return false;
  }
};

// ---------------- ADMIN APPROVAL EMAIL ----------------
export const sendAdminApprovalEmail = async (superAdminEmail, newAdminData) => {
  try {
    const approveLink = `${process.env.ADMIN_DASHBOARD_URL}/admin/approve/${newAdminData.id}?action=approve`;
    const rejectLink = `${process.env.ADMIN_DASHBOARD_URL}/admin/approve/${newAdminData.id}?action=reject`;

    await resend.emails.send({
      from: `Hype2Day <${process.env.EMAIL_FROM}>`,
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

    await resend.emails.send({
      from: `Hype2Day <${process.env.EMAIL_FROM}>`,
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
