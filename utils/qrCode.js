import QRCode from "qrcode";

export async function generateProductQRCode(productId) {
  try {
    const qrDataUrl = await QRCode.toDataURL(productId, {
      errorCorrectionLevel: "H",
      type: "image/png",
      quality: 0.95,
      margin: 1,
      width: 300,
    });
    
    return qrDataUrl;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
}
