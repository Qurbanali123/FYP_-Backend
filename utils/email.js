// utils/email.js
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY,
});

// ✅ Use your MailerSend test domain sender email
const SENDER_EMAIL = "no-reply@test-3m5jgroqke0gdpyo.mlsender.net";

/* ================= SEND OTP EMAIL ================= */
export const sendOTPEmail = async (email, otp, userType) => {
  try {
    console.log("🚀 sendOTPEmail function called");
    console.log("👤 User Type:", userType);
    console.log("📧 To Email:", email);
    console.log("🔐 OTP:", otp);

    const sentFrom = new Sender(SENDER_EMAIL, "FYP System");
    const recipients = [new Recipient(email)];

    const subject =
      userType === "admin"
        ? "Admin Registration - Verify Your Email with OTP"
        : "Seller Registration - Verify Your Email with OTP";

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject(subject)
      .setHtml(`
        <h2>Email Verification</h2>
        <p>Your OTP for <strong>${userType}</strong> registration is:</p>
        <h1 style="letter-spacing:5px;">${otp}</h1>
        <p>This OTP expires in 10 minutes.</p>
      `);

    await mailerSend.email.send(emailParams);

    console.log("✅ OTP email sent to", email);
    return true;
  } catch (error) {
    console.error("❌ OTP email failed:", error);
    return false;
  }
};

/* ================= ADMIN APPROVAL EMAIL ================= */
export const sendAdminApprovalEmail = async (superAdminEmail, newAdminData) => {
  try {
    console.log("🚀 sendAdminApprovalEmail called");
    console.log("📧 Super Admin Email:", superAdminEmail);

    const sentFrom = new Sender(SENDER_EMAIL, "FYP System");
    const recipients = [new Recipient(superAdminEmail)];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject("New Admin Registration Request")
      .setHtml(`
        <h2>New Admin Registration Request</h2>
        <p><strong>Name:</strong> ${newAdminData.name}</p>
        <p><strong>Email:</strong> ${newAdminData.email}</p>
        <p>Please review in admin panel.</p>
      `);

    await mailerSend.email.send(emailParams);

    console.log("✅ Admin approval email sent to", superAdminEmail);
    return true;
  } catch (error) {
    console.error("❌ Admin approval email failed:", error);
    return false;
  }
};

/* ================= PASSWORD RESET EMAIL ================= */
export const sendPasswordResetEmail = async (email, otp, userType) => {
  try {
    console.log("🚀 sendPasswordResetEmail called");
    console.log("📧 Email:", email);
    console.log("🔐 OTP:", otp);

    const sentFrom = new Sender(SENDER_EMAIL, "FYP System");
    const recipients = [new Recipient(email)];

    const subject =
      userType === "admin"
        ? "Password Reset - Verify with OTP"
        : "Password Reset Request - Verify with OTP";

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject(subject)
      .setHtml(`
        <h2>Password Reset</h2>
        <h1>${otp}</h1>
        <p>This OTP expires in 10 minutes.</p>
      `);

    await mailerSend.email.send(emailParams);

    console.log("✅ Password reset email sent to", email);
    return true;
  } catch (error) {
    console.error("❌ Password reset email failed:", error);
    return false;
  }
};
