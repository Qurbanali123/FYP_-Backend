import Blockchain from "./blockchain.js";
import Wallet from "./wallet.js";
import Transaction from "./transaction.js";
import Block from "./block.js";

const blockchain = new Blockchain();
const adminWallet = new Wallet();

function addProductToBlockchain(productId, productHash) {
    const signature = adminWallet.sign(productHash);

    const transaction = new Transaction(
        productId,
        productHash,
        adminWallet.publicKey,
        signature
    );

    const block = new Block(
        blockchain.chain.length,
        Date.now(),
        transaction,
        blockchain.getLatestBlock().hash
    );

    blockchain.addBlock(block);

    return transaction;
}

function verifyProduct(productId, productHash) {
    const record = blockchain.findProduct(productId);

    if (!record) return { valid: false, msg: "Product Not Found" };

    const isValid = Transaction.verifyTransaction(record);

    if (!isValid || record.productHash !== productHash) {
        return { valid: false, msg: "FAKE PRODUCT ❌" };
    }

    return { valid: true, msg: "ORIGINAL PRODUCT ✅", record };
}

export {
    blockchain,
    addProductToBlockchain,
    verifyProduct,
    adminWallet
};
