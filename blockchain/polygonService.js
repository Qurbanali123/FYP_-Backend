import { ethers } from "ethers";
import { PRODUCT_REGISTRY_ABI } from "./contractABI.js";

const POLYGON_AMOY_RPC = "https://rpc-amoy.polygon.technology/";
const CONTRACT_ADDRESS = process.env.POLYGON_CONTRACT_ADDRESS;
const PRIVATE_KEY = process.env.POLYGON_PRIVATE_KEY;

let contract = null;
let provider = null;
let signer = null;

function initializeContract() {
  if (!CONTRACT_ADDRESS) {
    console.error("❌ POLYGON_CONTRACT_ADDRESS not set in .env");
    return null;
  }
  
  if (!PRIVATE_KEY) {
    console.error("❌ POLYGON_PRIVATE_KEY not set in .env");
    return null;
  }

  try {
    provider = new ethers.JsonRpcProvider(POLYGON_AMOY_RPC);
    signer = new ethers.Wallet(PRIVATE_KEY, provider);
    contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      PRODUCT_REGISTRY_ABI,
      signer
    );
    console.log("✓ Connected to Polygon Amoy ProductRegistry contract");
    return contract;
  } catch (error) {
    console.error("❌ Failed to initialize contract:", error.message);
    return null;
  }
}

export async function addProductToBlockchain(productData) {
  try {
    if (!contract) {
      contract = initializeContract();
      if (!contract) throw new Error("Contract not initialized");
    }

    const { productId, name, brand, batchNo, expiryDate } = productData;
    
    console.log(`📝 Adding product to blockchain: ${productId}`);
    
    const tx = await contract.addProduct(productId, name, brand, batchNo, expiryDate);
    console.log(`⏳ Transaction sent: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
    
    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      status: "success"
    };
  } catch (error) {
    console.error("❌ Error adding product to blockchain:", error.message);
    throw error;
  }
}

export async function getProductFromBlockchain(productId) {
  try {
    if (!contract) {
      contract = initializeContract();
      if (!contract) throw new Error("Contract not initialized");
    }

    console.log(`🔍 Fetching product from blockchain: ${productId}`);
    
    const product = await contract.getProduct(productId);
    
    return {
      productId: product.productId,
      name: product.name,
      brand: product.brand,
      batchNo: product.batchNo,
      expiryDate: product.expiryDate,
      seller: product.seller,
      found: true
    };
  } catch (error) {
    if (error.message.includes("Product not found")) {
      return { found: false, message: "Product not found on blockchain" };
    }
    console.error("❌ Error fetching product from blockchain:", error.message);
    throw error;
  }
}

export function getContractAddress() {
  return CONTRACT_ADDRESS;
}
