import 'dotenv/config';
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";

// Initialize MailerSend
const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY
});

// Test domain sender
const TEST_SENDER_EMAIL = "no-reply@ghizershilajit.com"; //test-3m5jgroqke0gdpyo.mlsender.net
const APP_NAME = "My App"; // change to your app name

// Send OTP Email
export const sendOTPEmail = async (email, otp, userType) => {
  try {
    const subject = userType === "admin" 
      ? "Admin Registration - Verify Your Email with OTP"
      : "Seller Registration - Verify Your Email with OTP";

    const htmlContent = `
      <h2>Email Verification</h2>
      <p>Your OTP for ${userType} registration is:</p>
      <h1 style="color: #007bff; letter-spacing: 5px;">${otp}</h1>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    const sentFrom = new Sender(TEST_SENDER_EMAIL, APP_NAME);
    const recipients = [new Recipient(email)];
    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject(subject)
      .setHtml(htmlContent);

    await mailerSend.email.send(emailParams);
    return true;
  } catch (error) {
    console.error("❌ Email sending error:", error);
    return false;
  }
};

// Send Admin Approval Email
export const sendAdminApprovalEmail = async (superAdminEmail, newAdminData) => {
  try {
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
      <p style="margin-top: 20px;">
        <a href="${approveLink}" style="display: inline-block; padding: 10px 20px; margin-right: 10px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px;">Approve</a>
        <a href="${rejectLink}" style="display: inline-block; padding: 10px 20px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px;">Reject</a>
      </p>
      <p style="margin-top: 20px;">Or manage approvals in your Admin Dashboard.</p>
    `;

    const sentFrom = new Sender(TEST_SENDER_EMAIL, APP_NAME);
    const recipients = [new Recipient(superAdminEmail)];
    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject("New Admin Registration Request")
      .setHtml(htmlContent);

    await mailerSend.email.send(emailParams);
    return true;
  } catch (error) {
    console.error("❌ Email sending error:", error);
    return false;
  }
};

// Send Password Reset Email
export const sendPasswordResetEmail = async (email, otp, userType) => {
  try {
    const subject = userType === "admin" 
      ? "Password Reset - Verify with OTP"
      : "Password Reset Request - Verify with OTP";

    const htmlContent = `
      <h2>Password Reset Request</h2>
      <p>You have requested to reset your password. Your OTP is:</p>
      <h1 style="color: #007bff; letter-spacing: 5px;">${otp}</h1>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
    `;

    const sentFrom = new Sender(TEST_SENDER_EMAIL, APP_NAME);
    const recipients = [new Recipient(email)];
    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject(subject)
      .setHtml(htmlContent);

    await mailerSend.email.send(emailParams);
    return true;
  } catch (error) {
    console.error("❌ Email sending error:", error);
    return false;
  }
};

export default mailerSend;
