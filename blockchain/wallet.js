import crypto from "crypto";

class Wallet {
    constructor() {
        const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", {
            namedCurve: "secp256k1"
        });

        this.privateKey = privateKey.export({ type: "pkcs8", format: "pem" });
        this.publicKey = publicKey.export({ type: "spki", format: "pem" });
    }

    sign(dataHash) {
        const sign = crypto.createSign("SHA256");
        sign.update(dataHash);
        sign.end();
        return sign.sign(this.privateKey, "hex");
    }
}

export default Wallet;
