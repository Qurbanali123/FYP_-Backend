import express from "express";
import db from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendOTPEmail, sendAdminApprovalEmail, sendPasswordResetEmail } from "../utils/email.js";
import { verifyToken } from "./auth.js";

const router = express.Router();

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ message: "All fields required" });

  try {
    const [existing] = await db
      .promise()
      .query("SELECT * FROM admins WHERE email = ?", [email]);

    if (existing.length > 0)
      return res.status(400).json({ message: "Email already registered" });

    const otp = generateOTP();
    const hashedPassword = await bcrypt.hash(password, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await db.promise().query(
      "INSERT INTO admin_otps (email, otp, otp_expiry, hashed_password) VALUES (?, ?, ?, ?)",
      [email, otp, otpExpiry, hashedPassword]
    );

    const emailSent = await sendOTPEmail(email, otp, "admin");

    if (!emailSent) {
      return res.status(500).json({ message: "Failed to send OTP email" });
    }

    res.json({ 
      message: "OTP sent to email. Please verify within 10 minutes.",
      email 
    });
  } catch (error) {
    console.error("❌ Admin registration error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp)
    return res.status(400).json({ message: "Email and OTP required" });

  try {
    const [rows] = await db
      .promise()
      .query("SELECT * FROM admin_otps WHERE email = ? AND otp = ?", [email, otp]);

    if (rows.length === 0)
      return res.status(400).json({ message: "Invalid OTP" });

    const otpRecord = rows[0];
    
    if (new Date() > otpRecord.otp_expiry)
      return res.status(400).json({ message: "OTP expired" });

    const name = email.split("@")[0];
    
    await db.promise().query(
      "INSERT INTO admins (name, email, password, status) VALUES (?, ?, ?, ?)",
      [name, email, otpRecord.hashed_password, "pending"]
    );

    await db.promise().query("DELETE FROM admin_otps WHERE email = ?", [email]);

    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    
    if (superAdminEmail) {
      const [newAdmin] = await db
        .promise()
        .query("SELECT id, name, email FROM admins WHERE email = ?", [email]);
      
      if (newAdmin.length > 0) {
        await sendAdminApprovalEmail(superAdminEmail, newAdmin[0]);
      }
    }

    res.json({ 
      message: "OTP verified successfully. Awaiting admin approval.",
      email 
    });
  } catch (error) {
    console.error("❌ OTP verification error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db
      .promise()
      .query("SELECT * FROM admins WHERE email = ?", [email]);

    if (rows.length === 0)
      return res.status(401).json({ message: "Invalid credentials" });

    const admin = rows[0];

    if (admin.status === "pending")
      return res.status(403).json({ message: "Admin account pending approval" });

    if (admin.status === "rejected" || admin.status === "blocked")
      return res.status(403).json({ message: "Admin account is not active" });

    const ok = await bcrypt.compare(password, admin.password);

    if (!ok)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: false
    });

    res.json({
      message: "Login successful",
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: "admin"
      }
    });
  } catch (error) {
    console.error("❌ Admin login error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/sellers", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Access denied" });

    const [sellers] = await db
      .promise()
      .query("SELECT id, company_name, owner_name, email, status, created_at FROM sellers ORDER BY created_at DESC");

    res.json({ sellers });
  } catch (error) {
    console.error("❌ Get sellers error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.put("/sellers/:id/approve", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Access denied" });

    const { id } = req.params;

    const [result] = await db.promise().query(
      "UPDATE sellers SET status = ? WHERE id = ?",
      ["approved", id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Seller not found" });

    res.json({ message: "Seller approved successfully" });
  } catch (error) {
    console.error("❌ Approve seller error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.put("/sellers/:id/reject", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Access denied" });

    const { id } = req.params;

    const [result] = await db.promise().query(
      "UPDATE sellers SET status = ? WHERE id = ?",
      ["rejected", id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Seller not found" });

    res.json({ message: "Seller rejected successfully" });
  } catch (error) {
    console.error("❌ Reject seller error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.put("/sellers/:id/block", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Access denied" });

    const { id } = req.params;

    const [result] = await db.promise().query(
      "UPDATE sellers SET status = ? WHERE id = ?",
      ["blocked", id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Seller not found" });

    res.json({ message: "Seller blocked successfully" });
  } catch (error) {
    console.error("❌ Block seller error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.delete("/sellers/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Access denied" });

    const { id } = req.params;

    const [result] = await db.promise().query(
      "DELETE FROM sellers WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Seller not found" });

    res.json({ message: "Seller deleted successfully" });
  } catch (error) {
    console.error("❌ Delete seller error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/pending-admins", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Access denied" });

    const [admins] = await db
      .promise()
      .query("SELECT id, name, email, status, created_at FROM admins WHERE status IN ('pending', 'rejected', 'blocked') OR id != ? ORDER BY created_at DESC", [req.user.id]);

    res.json({ admins });
  } catch (error) {
    console.error("❌ Get pending admins error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/all-admins", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Access denied" });

    const [admins] = await db
      .promise()
      .query("SELECT id, name, email, status, created_at FROM admins ORDER BY created_at DESC");

    res.json({ admins });
  } catch (error) {
    console.error("❌ Get all admins error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.put("/admins/:id/approve", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Access denied" });

    const { id } = req.params;

    const [result] = await db.promise().query(
      "UPDATE admins SET status = ? WHERE id = ?",
      ["approved", id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Admin not found" });

    res.json({ message: "Admin approved successfully" });
  } catch (error) {
    console.error("❌ Approve admin error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.put("/admins/:id/reject", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Access denied" });

    const { id } = req.params;

    const [result] = await db.promise().query(
      "UPDATE admins SET status = ? WHERE id = ?",
      ["rejected", id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Admin not found" });

    res.json({ message: "Admin rejected successfully" });
  } catch (error) {
    console.error("❌ Reject admin error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.put("/admins/:id/block", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Access denied" });

    const { id } = req.params;

    const [result] = await db.promise().query(
      "UPDATE admins SET status = ? WHERE id = ?",
      ["blocked", id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Admin not found" });

    res.json({ message: "Admin blocked successfully" });
  } catch (error) {
    console.error("❌ Block admin error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.delete("/admins/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Access denied" });

    const { id } = req.params;

    const [result] = await db.promise().query(
      "DELETE FROM admins WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Admin not found" });

    res.json({ message: "Admin deleted successfully" });
  } catch (error) {
    console.error("❌ Delete admin error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/forget-password", async (req, res) => {
  const { email } = req.body;

  if (!email)
    return res.status(400).json({ message: "Email is required" });

  try {
    const [rows] = await db
      .promise()
      .query("SELECT * FROM admins WHERE email = ?", [email]);

    if (rows.length === 0)
      return res.status(404).json({ message: "Admin not found with this email" });

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await db.promise().query(
      "DELETE FROM admin_password_reset WHERE email = ?",
      [email]
    );

    await db.promise().query(
      "INSERT INTO admin_password_reset (email, otp, otp_expiry) VALUES (?, ?, ?)",
      [email, otp, otpExpiry]
    );

    const emailSent = await sendPasswordResetEmail(email, otp, "admin");

    if (!emailSent) {
      return res.status(500).json({ message: "Failed to send OTP email" });
    }

    res.json({ 
      message: "Password reset OTP sent to your email. Please verify within 10 minutes.",
      email 
    });
  } catch (error) {
    console.error("❌ Forget password error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword)
    return res.status(400).json({ message: "Email, OTP, and new password are required" });

  try {
    const [rows] = await db
      .promise()
      .query("SELECT * FROM admin_password_reset WHERE email = ? AND otp = ?", [email, otp]);

    if (rows.length === 0)
      return res.status(400).json({ message: "Invalid OTP" });

    const resetRecord = rows[0];
    
    if (new Date() > resetRecord.otp_expiry)
      return res.status(400).json({ message: "OTP has expired" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.promise().query(
      "UPDATE admins SET password = ? WHERE email = ?",
      [hashedPassword, email]
    );

    await db.promise().query(
      "DELETE FROM admin_password_reset WHERE email = ?",
      [email]
    );

    res.json({ 
      message: "Password reset successfully. You can now login with your new password.",
      email 
    });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
