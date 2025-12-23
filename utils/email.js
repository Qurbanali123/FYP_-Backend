import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ Simple sender (no name)
const FROM_EMAIL = process.env.EMAIL_FROM;

/* ================= SEND OTP EMAIL ================= */
export const sendOTPEmail = async (email, otp, userType) => {
  try {
    if (!FROM_EMAIL) {
      console.error("❌ EMAIL_FROM missing in env");
      return false;
    }

    const subject =
      userType === "admin"
        ? "Admin Registration - Verify Your Email with OTP"
        : "Seller Registration - Verify Your Email with OTP";

    console.log("📧 Sending OTP to:", email);
    console.log("📤 FROM:", FROM_EMAIL);

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,       // ✅ onboarding@resend.dev
      to: [email],            // ✅ array required
      subject,
      html: `
        <h2>Email Verification</h2>
        <p>Your OTP for <strong>${userType}</strong> registration is:</p>
        <h1 style="letter-spacing:5px;">${otp}</h1>
        <p>This OTP expires in 10 minutes.</p>
      `,
    });

    if (error) {
      console.error("❌ Resend error:", error);
      return false;
    }

    console.log("✅ OTP email sent:", data?.id);
    return true;

  } catch (error) {
    console.error("❌ OTP email exception:", error);
    return false;
  }
};

/* ================= ADMIN APPROVAL EMAIL ================= */
export const sendAdminApprovalEmail = async (superAdminEmail, newAdminData) => {
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [superAdminEmail],
      subject: "New Admin Registration Request",
      html: `
        <h2>New Admin Registration Request</h2>
        <p><strong>Name:</strong> ${newAdminData.name}</p>
        <p><strong>Email:</strong> ${newAdminData.email}</p>
        <p>Please review in admin panel.</p>
      `,
    });

    if (error) {
      console.error("❌ Admin approval email error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ Admin approval email exception:", error);
    return false;
  }
};

/* ================= PASSWORD RESET EMAIL ================= */
export const sendPasswordResetEmail = async (email, otp, userType) => {
  try {
    const subject =
      userType === "admin"
        ? "Password Reset - Verify with OTP"
        : "Password Reset Request - Verify with OTP";

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [email],
      subject,
      html: `
        <h2>Password Reset</h2>
        <h1>${otp}</h1>
        <p>This OTP expires in 10 minutes.</p>
      `,
    });

    if (error) {
      console.error("❌ Password reset email error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ Password reset email exception:", error);
    return false;
  }
};
