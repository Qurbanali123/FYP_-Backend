import { Jimp } from "jimp";
import QRCode from "qrcode";   // if you use qrcode library



import { generateCryptoToken } from "./cryptoToken.js";

export async function generateDualLayerQR(productData) {
  try {
    const { productId, name, brand, batchNo, expiryDate } = productData;

    console.log("🔐 Generating dual-layer QR code...");

    const cryptoToken = generateCryptoToken(productData);

    const publicLayerData = JSON.stringify({
      productId,
      name,
      brand,
      batchNo,
      expiryDate,
    });

    const secretLayerData = JSON.stringify({
      token: cryptoToken.token,
      signature: cryptoToken.signature,
      productId,
      timestamp: cryptoToken.payload.timestamp,
    });

    console.log("📊 Layer 1 (Public):", publicLayerData);
    console.log("🔒 Layer 2 (Secret) - Encrypted token stored");

    const visibleQR = await generateVisibleQR(publicLayerData);
    const hiddenQR = await generateHiddenMicroQR(secretLayerData);

    const combinedQR = await embedHiddenQRIntoVisible(
      visibleQR,
      hiddenQR,
      productId
    );

    return {
      visibleLayerData: publicLayerData,
      secretLayerData: secretLayerData,
      cryptoToken: cryptoToken.token,
      signature: cryptoToken.signature,
      qrImage: combinedQR,
      format: "dual-layer",
      timestamp: cryptoToken.payload.timestamp,
      nonce: cryptoToken.payload.nonce,
    };
  } catch (error) {
    console.error("❌ Error generating dual-layer QR:", error);
    throw error;
  }
}

async function generateVisibleQR(data) {
  try {
    console.log("✨ Generating visible QR layer...");
    const qrDataUrl = await QRCode.toDataURL(data, {
      errorCorrectionLevel: "H",
      type: "image/png",
      quality: 0.95,
      margin: 2,
      width: 300,
    });

    return qrDataUrl;
  } catch (error) {
    console.error("Error generating visible QR:", error);
    throw error;
  }
}

async function generateHiddenMicroQR(data) {
  try {
    console.log("🔍 Generating hidden micro-QR layer...");
    const qrDataUrl = await QRCode.toDataURL(data, {
      errorCorrectionLevel: "M",
      type: "image/png",
      quality: 0.95,
      margin: 1,
      width: 80,
    });

    return qrDataUrl;
  } catch (error) {
    console.error("Error generating hidden micro-QR:", error);
    throw error;
  }
}

async function embedHiddenQRIntoVisible(visibleDataUrl, hiddenDataUrl, productId) {
  try {
    console.log("🎭 Embedding hidden QR into visible QR...");

    const visibleImage = await Jimp.read(Buffer.from(visibleDataUrl.split(",")[1], "base64"));
    const hiddenImage = await Jimp.read(Buffer.from(hiddenDataUrl.split(",")[1], "base64"));

    const hiddenX = visibleImage.bitmap.width - hiddenImage.bitmap.width - 10;
    const hiddenY = visibleImage.bitmap.height - hiddenImage.bitmap.height - 10;

    hiddenImage.opacity(0.15);

    visibleImage.composite(hiddenImage, hiddenX, hiddenY);

    const addSecurityMarkers = (img) => {
      const cornerSize = 20;
      const color = 0xff0000ff;

      img.setPixelColor(color, 0, 0);
      img.setPixelColor(color, img.bitmap.width - 1, 0);
      img.setPixelColor(color, 0, img.bitmap.height - 1);
      img.setPixelColor(color, img.bitmap.width - 1, img.bitmap.height - 1);

      return img;
    };

    addSecurityMarkers(visibleImage);

    const finalImage = await visibleImage.getBuffer("image/png");
    const base64Image = finalImage.toString("base64");
    const dataUrl = `data:image/png;base64,${base64Image}`;

    console.log("✅ Dual-layer QR code created successfully");
    return dataUrl;
  } catch (error) {
    console.error("Error embedding hidden QR:", error);
    throw error;
  }
}

export async function extractLayersFromQR(qrImagePath) {
  try {
    console.log("🔍 Analyzing QR image for layers...");

    const image = await Jimp.read(qrImagePath);

    const width = image.bitmap.width;
    const height = image.bitmap.height;

    const hasSecurityMarkers =
      checkPixelColor(image, 0, 0) && 
      checkPixelColor(image, width - 1, 0) &&
      checkPixelColor(image, 0, height - 1) && 
      checkPixelColor(image, width - 1, height - 1);

    const hiddenX = width - 90;
    const hiddenY = height - 90;
    const hiddenRegion = image.crop(hiddenX, hiddenY, 80, 80);

    const hasVisibleContent = await analyzeQRContent(image);
    const hasHiddenContent = await analyzeHiddenRegion(hiddenRegion);

    return {
      hasVisibleLayer: hasVisibleContent,
      hasHiddenLayer: hasHiddenContent,
      hasSecurityMarkers: hasSecurityMarkers,
      isDualLayer:
        hasVisibleContent &&
        hasHiddenContent &&
        hasSecurityMarkers,
      analysis: {
        visibleOpacity: hasVisibleContent ? 1.0 : 0,
        hiddenOpacity: hasHiddenContent ? 0.15 : 0,
        detectionMethod: "image-analysis",
      },
    };
  } catch (error) {
    console.error("Error analyzing QR image:", error);
    return {
      hasVisibleLayer: false,
      hasHiddenLayer: false,
      hasSecurityMarkers: false,
      isDualLayer: false,
      error: error.message,
    };
  }
}

async function analyzeQRContent(image) {
  try {
    let darkPixelCount = 0;
    const threshold = 128;
    let sampledPixels = 0;

    for (let x = 0; x < image.bitmap.width; x += 5) {
      for (let y = 0; y < image.bitmap.height; y += 5) {
        const hex = image.getPixelColor(x, y);
        const rgb = Jimp.intToRGBA(hex);
        const brightness = (rgb.r + rgb.g + rgb.b) / 3;

        if (brightness < threshold) {
          darkPixelCount++;
        }
        sampledPixels++;
      }
    }

    const darkRatio = darkPixelCount / sampledPixels;
    return darkRatio > 0.3 && darkRatio < 0.7;
  } catch (error) {
    console.error("Error analyzing QR content:", error);
    return false;
  }
}

async function analyzeHiddenRegion(region) {
  try {
    let uniquePixels = 0;
    const pixelMap = {};
    let sampledPixels = 0;

    for (let x = 0; x < region.bitmap.width; x += 2) {
      for (let y = 0; y < region.bitmap.height; y += 2) {
        const hex = region.getPixelColor(x, y);
        pixelMap[hex] = (pixelMap[hex] || 0) + 1;
        sampledPixels++;
      }
    }

    uniquePixels = Object.keys(pixelMap).length;
    const uniqueRatio = uniquePixels / sampledPixels;

    return uniqueRatio > 0.5;
  } catch (error) {
    console.error("Error analyzing hidden region:", error);
    return false;
  }
}

function checkPixelColor(image, x, y) {
  try {
    const hex = image.getPixelColor(x, y);
    const rgb = Jimp.intToRGBA(hex);
    const isRed = rgb.r > 200 && rgb.g < 100 && rgb.b < 100;
    return isRed;
  } catch (error) {
    return false;
  }
}
