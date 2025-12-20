import express from "express";
import db from "../db.js";
import bcrypt from "bcryptjs";
import { verifyToken } from "./auth.js";
import { sendPasswordResetEmail } from "../utils/email.js";
import { addProductToBlockchain, getProductFromBlockchain } from "../blockchain/polygonService.js";
import { generateProductQRCode } from "../utils/qrCode.js";
import { generateDualLayerQR, extractLayersFromQR } from "../utils/dualLayerQR.js";
import { verifyCryptoToken } from "../utils/cryptoToken.js";

const router = express.Router();

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

router.post("/forget-password", async (req, res) => {
  const { email } = req.body;

  if (!email)
    return res.status(400).json({ message: "Email is required" });

  try {
    const [rows] = await db
      .query("SELECT * FROM sellers WHERE email = ?", [email]);

    if (rows.length === 0)
      return res.status(404).json({ message: "Seller not found with this email" });

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await db.query(
      "DELETE FROM seller_password_reset WHERE email = ?",
      [email]
    );

    await db.query(
      "INSERT INTO seller_password_reset (email, otp, otp_expiry) VALUES (?, ?, ?)",
      [email, otp, otpExpiry]
    );

    const emailSent = await sendPasswordResetEmail(email, otp, "seller");

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
      .query("SELECT * FROM seller_password_reset WHERE email = ? AND otp = ?", [email, otp]);

    if (rows.length === 0)
      return res.status(400).json({ message: "Invalid OTP" });

    const resetRecord = rows[0];
    
    if (new Date() > resetRecord.otp_expiry)
      return res.status(400).json({ message: "OTP has expired" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query(
      "UPDATE sellers SET password = ? WHERE email = ?",
      [hashedPassword, email]
    );

    await db.query(
      "DELETE FROM seller_password_reset WHERE email = ?",
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

    //ADD PRODUCT + BLOCKCHAIN

router.post("/add-product", verifyToken, async (req, res) => {
  try {
    const { product_id, name, brand, batch_no, expiry_date } = req.body;

    if (!product_id || !name || !brand || !batch_no || !expiry_date) {
      return res.status(400).json({ message: "All fields required" });
    }

    const sellerId = req.user.id;

    // Step 1: Add product to Polygon Amoy blockchain
    console.log("🔗 Adding product to Polygon Amoy blockchain...");
    const blockchainResult = await addProductToBlockchain({
      productId: product_id,
      name: name,
      brand: brand,
      batchNo: batch_no,
      expiryDate: expiry_date
    });

    // Step 2: Generate dual-layer QR code with hidden cryptographic layer
    console.log("🔐 Generating dual-layer QR code...");
    const dualLayerResult = await generateDualLayerQR({
      productId: product_id,
      name: name,
      brand: brand,
      batchNo: batch_no,
      expiryDate: expiry_date
    });

    // Step 3: Store product data in database with crypto token
    console.log("💾 Storing product in database with dual-layer security...");
    await db.query(
      `INSERT INTO products 
       (seller_id, product_id, name, brand, batch_no, expiry_date, crypto_token, token_signature, hidden_qr_nonce, qr_timestamp, qr_version) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sellerId, 
        product_id, 
        name, 
        brand, 
        batch_no, 
        expiry_date,
        dualLayerResult.cryptoToken,
        dualLayerResult.signature,
        dualLayerResult.nonce,
        dualLayerResult.timestamp,
        'dual-layer'
      ]
    );

    res.json({
      message: "✅ Product added with dual-layer QR security to blockchain",
      product_id: product_id,
      blockchain: blockchainResult,
      qr_code: dualLayerResult.qrImage,
      security_info: {
        format: "dual-layer",
        visibleLayerActive: true,
        hiddenLayerActive: true,
        cryptographicProtection: true
      }
    });
  } catch (error) {
    console.error("❌ Add product error:", error.message);
    res.status(500).json({ 
      message: "Cannot add product", 
      error: error.message 
    });
  }
});

router.get("/my-products", verifyToken, async (req, res) => {
  try {
    const sellerId = req.user.id;
    const [rows] = await db
      .query("SELECT * FROM products WHERE seller_id = ?", [sellerId]);

    res.json(rows);
  } catch (error) {
    console.error("Fetch products error:", error);
    res.status(500).json({ message: "Cannot fetch products", error });
  }
});

/* =====================================================
   EDIT PRODUCT (Protected)
===================================================== */
router.put("/edit/:product_id", verifyToken, async (req, res) => {
  try {
    const { product_id } = req.params;
    const { name, brand, batch_no, expiry_date } = req.body;
    const sellerId = req.user.id;

    if (!name || !brand || !batch_no || !expiry_date) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const [result] = await db.query(
      `UPDATE products 
       SET name = ?, brand = ?, batch_no = ?, expiry_date = ?
       WHERE product_id = ? AND seller_id = ?`,
      [name, brand, batch_no, expiry_date, product_id, sellerId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Product not found or you are not authorized to update this product",
      });
    }

    res.json({ message: "Product updated successfully" });
  } catch (error) {
    console.error("❌ EDIT PRODUCT ERROR:", error);
    res.status(500).json({ message: "Cannot update product", error });
  }
});

/* =====================================================
   DELETE PRODUCT (Protected)
===================================================== */
router.delete("/delete/:product_id", verifyToken, async (req, res) => {
  try {
    const { product_id } = req.params;
    const sellerId = req.user.id;

    const [result] = await db
      .query(
        `DELETE FROM products WHERE product_id = ? AND seller_id = ?`,
        [product_id, sellerId]
      );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Product not found or not authorized" });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("❌ DELETE PRODUCT ERROR:", error);
    res.status(500).json({ message: "Cannot delete product", error });
  }
});


router.get("/verify/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const { hiddenLayerToken, hiddenLayerSignature } = req.query;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    // Step 1: Get product from database with dual-layer security info
    const [rows] = await db
      .query(
        `SELECT 
          product_id, name, brand, batch_no, expiry_date, 
          crypto_token, token_signature, hidden_qr_nonce, qr_timestamp, qr_version
         FROM products WHERE product_id = ?`,
        [productId]
      );

    if (rows.length === 0) {
      return res.status(404).json({ message: "❌ Product not found in database" });
    }

    const dbProduct = rows[0];

    // Step 2: Verify product on Polygon Amoy blockchain
    const blockchainProduct = await getProductFromBlockchain(productId);

    if (!blockchainProduct.found) {
      return res.json({ 
        product: { product_id: dbProduct.product_id, name: dbProduct.name, brand: dbProduct.brand },
        blockchain_verification: blockchainProduct,
        authenticity: "❌ FAKE PRODUCT - Not found on blockchain",
        dual_layer_check: { 
          visibleLayer: true, 
          hiddenLayer: false, 
          bothLayersVerified: false 
        }
      });
    }

    // Step 3: Compare basic data
    const basicDataMatches = 
      dbProduct.name === blockchainProduct.name &&
      dbProduct.brand === blockchainProduct.brand &&
      dbProduct.batch_no === blockchainProduct.batchNo &&
      dbProduct.expiry_date === blockchainProduct.expiryDate;

    // Step 4: Verify hidden layer if provided
    let hiddenLayerVerified = false;
    let cryptoTokenValid = false;

    if (hiddenLayerToken && hiddenLayerSignature && dbProduct.crypto_token) {
      console.log("🔒 Verifying hidden cryptographic layer...");
      
      const tokenVerification = verifyCryptoToken(
        hiddenLayerToken,
        hiddenLayerSignature,
        {
          productId: productId,
          name: dbProduct.name,
          brand: dbProduct.brand,
          batchNo: dbProduct.batch_no,
          expiryDate: dbProduct.expiry_date
        }
      );

      cryptoTokenValid = tokenVerification.valid;
      hiddenLayerVerified = cryptoTokenValid && (hiddenLayerToken === dbProduct.crypto_token);

      if (cryptoTokenValid) {
        console.log("✅ Hidden layer verified successfully");
      }
    }

    // Step 5: Determine overall authenticity
    const bothLayersVerified = basicDataMatches && hiddenLayerVerified;
    let authenticity = "";
    
    if (bothLayersVerified) {
      authenticity = "✅ ORIGINAL PRODUCT - Both layers verified on blockchain";
    } else if (basicDataMatches && !hiddenLayerVerified && dbProduct.qr_version === 'dual-layer') {
      authenticity = "⚠️  SUSPICIOUS - Visible layer verified but hidden layer missing/invalid. Likely counterfeit.";
    } else if (basicDataMatches) {
      authenticity = "✅ VERIFIED - Visible layer confirmed on blockchain";
    } else {
      authenticity = "❌ FAKE PRODUCT - Data mismatch";
    }

    // Step 6: Update verification logs
    await db.query(
      `INSERT INTO qr_verification_logs 
       (product_id, visible_layer_detected, hidden_layer_detected, crypto_token_valid, verification_method, result) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        productId,
        basicDataMatches,
        hiddenLayerVerified,
        cryptoTokenValid,
        hiddenLayerToken ? 'hidden-detection' : 'manual-id',
        bothLayersVerified ? 'genuine' : (basicDataMatches && !hiddenLayerVerified ? 'partial-verification' : 'counterfeit')
      ]
    ).catch(err => console.log("⚠️ Could not log verification:", err.message));

    // Step 7: Update product verification stats
    if (basicDataMatches) {
      await db.query(
        `UPDATE products 
         SET verification_count = verification_count + 1, 
             last_verified_at = NOW(),
             is_verified_both_layers = ?
         WHERE product_id = ?`,
        [bothLayersVerified ? 1 : 0, productId]
      ).catch(err => console.log("⚠️ Could not update verification stats:", err.message));
    }

    res.json({ 
      product: {
        product_id: dbProduct.product_id,
        name: dbProduct.name,
        brand: dbProduct.brand,
        batch_no: dbProduct.batch_no,
        expiry_date: dbProduct.expiry_date
      },
      blockchain_verification: blockchainProduct,
      dual_layer_check: {
        visibleLayer: basicDataMatches,
        hiddenLayer: hiddenLayerVerified,
        bothLayersVerified: bothLayersVerified,
        cryptoTokenValid: cryptoTokenValid,
        qrFormat: dbProduct.qr_version
      },
      authenticity: authenticity,
      security_level: bothLayersVerified ? "MAXIMUM" : (basicDataMatches ? "STANDARD" : "CRITICAL")
    });
  } catch (err) {
    console.error("❌ VERIFY PRODUCT ERROR:", err);
    res.status(500).json({ message: "Cannot verify product", error: err.message });
  }
});
/* =====================================================
// backend: routes/products.js
router.get("/all", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM products");
    res.json({ products: rows });
  } catch (err) {
    res.status(500).json({ message: "Cannot fetch products", error: err });
  }
});/* ===================================================== */

export default router;
