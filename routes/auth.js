console.log("🔥 auth.js loaded");

import express from "express";
import db from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendOTPEmail } from "../utils/email.js"; // MailerSend version

const router = express.Router();

// 🔹 Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 🔒 JWT verify middleware
export const verifyToken = (req, res, next) => {
  let token = req.cookies?.token;

  if (!token && req.headers["authorization"]) {
    const authHeader = req.headers["authorization"];
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else {
      token = authHeader;
    }
  }

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; 
    next();
  } catch (err) {
    console.error("Token verification error:", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

// 🟩 Seller Registration
router.post("/register/seller", async (req, res) => {
  const { companyName, ownerName, email, password } = req.body;

  if (!companyName || !ownerName || !email || !password)
    return res.status(400).json({ message: "All fields required" });

  try {
    const [existing] = await db.query(
      "SELECT * FROM sellers WHERE email = ?", 
      [email]
    );

    if (existing.length > 0)
      return res.status(400).json({ message: "Email already registered" });

    const otp = generateOTP();
    const hashedPassword = await bcrypt.hash(password, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await db.query(
      "INSERT INTO seller_otps (company_name, owner_name, email, otp, otp_expiry, hashed_password) VALUES (?, ?, ?, ?, ?, ?)",
      [companyName, ownerName, email, otp, otpExpiry, hashedPassword]
    );

    // 🔹 Send OTP using MailerSend
    const emailSent = await sendOTPEmail(email, otp, "seller");

    if (!emailSent) {
      return res.status(500).json({ message: "Failed to send OTP email" });
    }

    res.status(201).json({ 
      message: "OTP sent to email. Please verify within 10 minutes.",
      email 
    });
  } catch (e) {
    console.error("❌ Seller registration error:", e);
    res.status(500).json({ message: "Server error", error: e });
  }
});

// 🟩 Seller OTP Verification
router.post("/verify-otp/seller", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp)
    return res.status(400).json({ message: "Email and OTP required" });

  try {
    const [rows] = await db.query(
      "SELECT * FROM seller_otps WHERE email = ? AND otp = ?", 
      [email, otp]
    );

    if (rows.length === 0)
      return res.status(400).json({ message: "Invalid OTP" });

    const otpRecord = rows[0];

    if (new Date() > otpRecord.otp_expiry)
      return res.status(400).json({ message: "OTP expired" });

    await db.query(
      "INSERT INTO sellers (company_name, owner_name, email, password, status) VALUES (?, ?, ?, ?, ?)",
      [otpRecord.company_name, otpRecord.owner_name, email, otpRecord.hashed_password, "pending"]
    );

    await db.query("DELETE FROM seller_otps WHERE email = ?", [email]);

    res.json({ 
      message: "Email verified. Awaiting admin approval.",
      email 
    });
  } catch (error) {
    console.error("❌ OTP verification error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// 🟩 Seller Login
router.post("/login/seller", async (req, res) => {
  const { email, password } = req.body;

  const [rows] = await db.query(
    "SELECT * FROM sellers WHERE email = ?", 
    [email]
  );

  if (rows.length === 0)
    return res.status(401).json({ message: "Invalid credentials" });

  const seller = rows[0];

  if (seller.status === "pending")
    return res.status(403).json({ message: "Your account is pending admin approval" });

  if (seller.status === "rejected" || seller.status === "blocked")
    return res.status(403).json({ message: "Your account has been rejected or blocked" });

  const ok = await bcrypt.compare(password, seller.password);

  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign(
    { id: seller.id, email: seller.email, role: "seller" },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );

  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "none",
    secure: true,
  });

  res.json({
    message: "Login successful",
    token,
    seller: {
      id: seller.id,
      companyName: seller.company_name,
      ownerName: seller.owner_name,
      email: seller.email
    }
  });
});

// 🟦 Customer Registration
router.post("/register/customer", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ message: "All fields required" });

  try {
    const [existing] = await db.query(
      "SELECT * FROM customers WHERE email = ?", 
      [email]
    );

    if (existing.length > 0)
      return res.status(400).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO customers (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashed]
    );

    res.status(201).json({ message: "Customer registered successfully" });
  } catch (err) {
    console.error("❌ Customer registration error:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
});

// 🟦 Customer Login
router.post("/login/customer", async (req, res) => {
  const { email, password } = req.body;

  const [rows] = await db.query(
    "SELECT * FROM customers WHERE email = ?", 
    [email]
  );

  if (rows.length === 0)
    return res.status(401).json({ message: "Invalid credentials" });

  const customer = rows[0];
  const ok = await bcrypt.compare(password, customer.password);

  if (!ok)
    return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign(
    { id: customer.id, email: customer.email, role: "customer" },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );

  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "none",
    secure: true,
  });

  res.json({
    message: "Login successful",
    token,
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email
    }
  });
});

export default router;
