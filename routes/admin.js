import express from "express";
import db from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  sendOTPEmail,
  sendAdminApprovalEmail,
  sendPasswordResetEmail
} from "../utils/email.js";
import { verifyToken } from "./auth.js";

const router = express.Router();

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/* ================= ADMIN REGISTER ================= */
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ message: "All fields required" });

  try {
    const [existing] = await db.query(
      "SELECT * FROM admins WHERE email = ?",
      [email]
    );

    if (existing.length > 0)
      return res.status(400).json({ message: "Email already registered" });

    const otp = generateOTP();
    const hashedPassword = await bcrypt.hash(password, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await db.query(
      "INSERT INTO admin_otps (email, otp, otp_expiry, hashed_password) VALUES (?, ?, ?, ?)",
      [email, otp, otpExpiry, hashedPassword]
    );

    const emailSent = await sendOTPEmail(email, otp, "admin");

    if (!emailSent)
      return res.status(500).json({ message: "OTP email failed" });

    res.json({
      message: "OTP sent successfully",
      email
    });
  } catch (error) {
    console.error("❌ Admin register error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= VERIFY OTP ================= */
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp)
    return res.status(400).json({ message: "Email and OTP required" });

  try {
    const [rows] = await db.query(
      "SELECT * FROM admin_otps WHERE email = ? AND otp = ?",
      [email, otp]
    );

    if (rows.length === 0)
      return res.status(400).json({ message: "Invalid OTP" });

    const record = rows[0];

    if (new Date() > record.otp_expiry)
      return res.status(400).json({ message: "OTP expired" });

    const name = email.split("@")[0];

    await db.query(
      "INSERT INTO admins (name, email, password, status) VALUES (?, ?, ?, ?)",
      [name, email, record.hashed_password, "pending"]
    );

    await db.query("DELETE FROM admin_otps WHERE email = ?", [email]);

    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;

    if (superAdminEmail) {
      const [admin] = await db.query(
        "SELECT id, name, email FROM admins WHERE email = ?",
        [email]
      );

      if (admin.length > 0) {
        await sendAdminApprovalEmail(superAdminEmail, admin[0]);
      }
    }

    res.json({
      message: "OTP verified. Waiting for approval"
    });
  } catch (error) {
    console.error("❌ Verify OTP error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= LOGIN ================= */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.query(
      "SELECT * FROM admins WHERE email = ?",
      [email]
    );

    if (rows.length === 0)
      return res.status(401).json({ message: "Invalid credentials" });

    const admin = rows[0];

    if (admin.status !== "approved")
      return res.status(403).json({ message: "Admin profiling not approved" });

    const ok = await bcrypt.compare(password, admin.password);
    if (!ok)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: admin.id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      message: "Login successful",
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email
      }
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= FORGET PASSWORD ================= */
router.post("/forget-password", async (req, res) => {
  const { email } = req.body;

  if (!email)
    return res.status(400).json({ message: "Email required" });

  try {
    const [admin] = await db.query(
      "SELECT * FROM admins WHERE email = ?",
      [email]
    );

    if (admin.length === 0)
      return res.status(404).json({ message: "Admin not found" });

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await db.query(
      "DELETE FROM admin_password_reset WHERE email = ?",
      [email]
    );

    await db.query(
      "INSERT INTO admin_password_reset (email, otp, otp_expiry) VALUES (?, ?, ?)",
      [email, otp, otpExpiry]
    );

    const sent = await sendPasswordResetEmail(email, otp, "admin");

    if (!sent)
      return res.status(500).json({ message: "Email failed" });

    res.json({ message: "OTP sent for password reset" });
  } catch (error) {
    console.error("❌ Forget password error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= RESET PASSWORD ================= */
router.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const [rows] = await db.query(
      "SELECT * FROM admin_password_reset WHERE email = ? AND otp = ?",
      [email, otp]
    );

    if (rows.length === 0)
      return res.status(400).json({ message: "Invalid OTP" });

    if (new Date() > rows[0].otp_expiry)
      return res.status(400).json({ message: "OTP expired" });

    const hashed = await bcrypt.hash(newPassword, 10);

    await db.query(
      "UPDATE admins SET password = ? WHERE email = ?",
      [hashed, email]
    );

    await db.query(
      "DELETE FROM admin_password_reset WHERE email = ?",
      [email]
    );

    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
