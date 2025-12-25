console.log("🔥 auth.js loaded");

import express from "express";
import db from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendOTPEmail } from "../utils/email.js";

const router = express.Router();

/* ============================
   UTILITIES
============================ */
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/* ============================
   JWT VERIFY MIDDLEWARE
============================ */
export const verifyToken = (req, res, next) => {
  const token =
    req.cookies?.token ||
    (req.headers.authorization
      ? req.headers.authorization.split(" ")[1]
      : null);

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("❌ JWT error:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

/* ============================
   SELLER REGISTRATION
============================ */
router.post("/register/seller", async (req, res) => {
  const { companyName, ownerName, email, password } = req.body;

  if (!companyName || !ownerName || !email || !password) {
    return res.status(400).json({ message: "All fields required" });
  }

  try {
    const [existing] = await db.query(
      "SELECT id FROM sellers WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const otp = generateOTP();
    const hashedPassword = await bcrypt.hash(password, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await db.query("DELETE FROM seller_otps WHERE email = ?", [email]);

    await db.query(
      `INSERT INTO seller_otps 
       (company_name, owner_name, email, otp, otp_expiry, hashed_password)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [companyName, ownerName, email, otp, otpExpiry, hashedPassword]
    );

    const emailSent = await sendOTPEmail(email, otp, "seller");

    if (!emailSent) {
      console.error("❌ OTP email failed for:", email);
      return res.status(500).json({ message: "Failed to send OTP email" });
    }

    res.status(201).json({
      message: "OTP sent to email. Please verify within 10 minutes.",
      email,
    });
  } catch (err) {
    console.error("❌ Seller register error:", err);
    res.status(500).json({
      message: "Server error during registration",
      error: err.message,
    });
  }
});

/* ============================
   SELLER OTP VERIFICATION
============================ */
router.post("/verify-otp/seller", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP required" });
  }

  try {
    const [rows] = await db.query(
      "SELECT * FROM seller_otps WHERE email = ? AND otp = ?",
      [email, otp]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const record = rows[0];

    if (new Date() > record.otp_expiry) {
      return res.status(400).json({ message: "OTP expired" });
    }

    await db.query(
      `INSERT INTO sellers 
       (company_name, owner_name, email, password, status)
       VALUES (?, ?, ?, ?, ?)`,
      [
        record.company_name,
        record.owner_name,
        email,
        record.hashed_password,
        "pending",
      ]
    );

    await db.query("DELETE FROM seller_otps WHERE email = ?", [email]);

    res.json({
      message: "Email verified. Awaiting admin approval.",
      email,
    });
  } catch (err) {
    console.error("❌ OTP verification error:", err);
    res.status(500).json({
      message: "Server error during OTP verification",
      error: err.message,
    });
  }
});

/* ============================
   SELLER LOGIN
============================ */
router.post("/login/seller", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.query(
      "SELECT * FROM sellers WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const seller = rows[0];

    if (seller.status !== "approved") {
      return res.status(403).json({
        message:
          seller.status === "pending"
            ? "Your account is pending admin approval"
            : "Your account is blocked or rejected",
      });
    }

    const ok = await bcrypt.compare(password, seller.password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: seller.id, email: seller.email, role: "seller" },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    res.json({
      message: "Login successful",
      token,
      seller: {
        id: seller.id,
        companyName: seller.company_name,
        ownerName: seller.owner_name,
        email: seller.email,
      },
    });
  } catch (err) {
    console.error("❌ Seller login error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ============================
   CUSTOMER REGISTRATION
============================ */
router.post("/register/customer", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields required" });
  }

  try {
    const [existing] = await db.query(
      "SELECT id FROM customers WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO customers (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashed]
    );

    res.status(201).json({ message: "Customer registered successfully" });
  } catch (err) {
    console.error("❌ Customer register error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ============================
   CUSTOMER LOGIN
============================ */
router.post("/login/customer", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.query(
      "SELECT * FROM customers WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const customer = rows[0];
    const ok = await bcrypt.compare(password, customer.password);

    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: customer.id, email: customer.email, role: "customer" },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    res.json({
      message: "Login successful",
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
      },
    });
  } catch (err) {
    console.error("❌ Customer login error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ============================
   TEST EMAIL ROUTE
============================ */
router.get("/test", async (req, res) => { 
  const testEmail = process.env.EMAIL_USER;
  const testOTP = "123456";
  const result = await sendOTPEmail(testEmail, testOTP, "seller");

  if (result) {
    res.json({ success: true, message: "Test OTP email sent successfully" });
  } else {
    res.status(500).json({ success: false, message: "Failed to send test email" });
  }
});

export default router;
