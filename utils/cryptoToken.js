import crypto from "crypto";
import CryptoJS from "crypto-js";

const SECRET_KEY = process.env.CRYPTO_SECRET_KEY || "dual-layer-qr-security-key-2024";

export function generateCryptoToken(productData) {
  try {
    const timestamp = Date.now();
    const payload = {
      productId: productData.productId,
      name: productData.name,
      brand: productData.brand,
      batchNo: productData.batchNo,
      expiryDate: productData.expiryDate,
      timestamp,
      nonce: crypto.randomBytes(16).toString("hex"),
    };

    const tokenString = JSON.stringify(payload);
    const encrypted = CryptoJS.AES.encrypt(tokenString, SECRET_KEY).toString();

    const hash = crypto
      .createHash("sha256")
      .update(tokenString + timestamp)
      .digest("hex");

    return {
      token: encrypted,
      hash: hash,
      payload: payload,
      signature: crypto
        .createHmac("sha256", SECRET_KEY)
        .update(encrypted)
        .digest("hex"),
    };
  } catch (error) {
    console.error("Error generating crypto token:", error);
    throw error;
  }
}

export function verifyCryptoToken(encryptedToken, signature, productData) {
  try {
    const computedSignature = crypto
      .createHmac("sha256", SECRET_KEY)
      .update(encryptedToken)
      .digest("hex");

    if (computedSignature !== signature) {
      return {
        valid: false,
        message: "Signature verification failed - Token tampered",
      };
    }

    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedToken, SECRET_KEY);
      const payload = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));

      const matches = {
        productId: payload.productId === productData.productId,
        name: payload.name === productData.name,
        brand: payload.brand === productData.brand,
        batchNo: payload.batchNo === productData.batchNo,
        expiryDate: payload.expiryDate === productData.expiryDate,
      };

      const allMatch = Object.values(matches).every((v) => v === true);

      return {
        valid: allMatch,
        message: allMatch ? "Token verified successfully" : "Token data mismatch",
        matches: matches,
        payload: payload,
      };
    } catch (decryptError) {
      return {
        valid: false,
        message: "Failed to decrypt token - Token corrupted",
      };
    }
  } catch (error) {
    console.error("Error verifying crypto token:", error);
    return {
      valid: false,
      message: "Token verification error",
    };
  }
}

export function generateRandomToken(length = 32) {
  return crypto.randomBytes(length).toString("hex");
}
