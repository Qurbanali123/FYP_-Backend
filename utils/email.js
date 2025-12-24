import { Resend } from "resend";

let resend = null;

/* ================= RESEND INSTANCE ================= */
const getResend = () => {
  if (!resend) {
    console.log("🔑 Checking RESEND_API_KEY...");
    console.log("🔑 RESEND_API_KEY:", process.env.RESEND_API_KEY ? "FOUND" : "MISSING");

    if (!process.env.RESEND_API_KEY) {
      throw new Error("❌ RESEND_API_KEY is not set in environment variables");
    }

    resend = new Resend(process.env.RESEND_API_KEY);
    console.log("✅ Resend instance initialized");
  }
  return resend;
};

/* ================= FROM EMAIL ================= */
const getFromEmail = () => {
  console.log("📨 Checking EMAIL_FROM...");
  console.log("📨 EMAIL_FROM:", process.env.EMAIL_FROM || "MISSING");

  const fromEmail = process.env.EMAIL_FROM;
  if (!fromEmail) {
    throw new Error("❌ EMAIL_FROM is not set in environment variables");
  }
  return fromEmail;
};

/* ================= SEND OTP EMAIL ================= */
export const sendOTPEmail = async (email, otp, userType) => {
  try {
    console.log("🚀 sendOTPEmail function called");
    console.log("👤 User Type:", userType);
    console.log("📧 To Email:", email);
    console.log("🔐 OTP:", otp);

    const fromEmail = getFromEmail();

    const subject =
      userType === "admin"
        ? "Admin Registration - Verify Your Email with OTP"
        : "Seller Registration - Verify Your Email with OTP";

    console.log("📤 FROM:", fromEmail);
    console.log("📝 SUBJECT:", subject);

    const resendClient = getResend();

    console.log("📡 Sending email via Resend...");

    const { data, error } = await resendClient.emails.send({
      from: fromEmail,          // onboarding@resend.dev
      to: [email],
      subject,
      html: `
        <h2>Email Verification</h2>
        <p>Your OTP for <strong>${userType}</strong> registration is:</p>
        <h1 style="letter-spacing:5px;">${otp}</h1>
        <p>This OTP expires in 10 minutes.</p>
      `,
    });

    if (error) {
      console.error("❌ Resend API ERROR:", error);
      return false;
    }

    console.log("✅ OTP email SENT SUCCESSFULLY");
    console.log("📩 Resend Message ID:", data?.id);

    return true;

  } catch (error) {
    console.error("❌ OTP EMAIL EXCEPTION:");
    console.error(error);
    return false;
  }
};

/* ================= ADMIN APPROVAL EMAIL ================= */
export const sendAdminApprovalEmail = async (superAdminEmail, newAdminData) => {
  try {
    console.log("🚀 sendAdminApprovalEmail called");
    console.log("📧 Super Admin Email:", superAdminEmail);

    const fromEmail = getFromEmail();
    const resendClient = getResend();

    const { data, error } = await resendClient.emails.send({
      from: fromEmail,
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

    console.log("✅ Admin approval email sent");
    console.log("📩 Message ID:", data?.id);

    return true;

  } catch (error) {
    console.error("❌ Admin approval email exception:", error);
    return false;
  }
};

/* ================= PASSWORD RESET EMAIL ================= */
export const sendPasswordResetEmail = async (email, otp, userType) => {
  try {
    console.log("🚀 sendPasswordResetEmail called");
    console.log("📧 Email:", email);
    console.log("🔐 OTP:", otp);

    const fromEmail = getFromEmail();
    const resendClient = getResend();

    const subject =
      userType === "admin"
        ? "Password Reset - Verify with OTP"
        : "Password Reset Request - Verify with OTP";

    const { data, error } = await resendClient.emails.send({
      from: fromEmail,
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

    console.log("✅ Password reset email sent");
    console.log("📩 Message ID:", data?.id);

    return true;

  } catch (error) {
    console.error("❌ Password reset email exception:", error);
    return false;
  }
};
