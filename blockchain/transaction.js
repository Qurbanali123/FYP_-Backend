import crypto from "crypto";

class Transaction {
    constructor(productId, productHash, ownerPublicKey, signature) {
        this.productId = productId;
        this.productHash = productHash;
        this.ownerPublicKey = ownerPublicKey;
        this.signature = signature;
    }

    static verifyTransaction(transaction) {
        const verify = crypto.createVerify("SHA256");
        verify.update(transaction.productHash);
        verify.end();

        return verify.verify(transaction.ownerPublicKey, transaction.signature, "hex");
    }
}

export default Transaction;
