import Block from "./block.js";

class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
    }

    createGenesisBlock() {
        return new Block(0, Date.now(), { msg: "Genesis Block" }, "0");
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    addBlock(newBlock) {
        newBlock.previousHash = this.getLatestBlock().hash;
        newBlock.hash = newBlock.calculateHash();
        this.chain.push(newBlock);
    }

    findProduct(productId) {
        for (const block of this.chain) {
            if (block.data.productId === productId) {
                return block.data;
            }
        }
        return null;
    }
}

export default Blockchain;
