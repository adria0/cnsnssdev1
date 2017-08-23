/* global assert */

module.exports = function txPrice(trn) {
    const tx = web3.eth.getTransaction(trn.tx);
    return web3.toBigNumber(trn.receipt.gasUsed).mul(tx.gasPrice);
};
