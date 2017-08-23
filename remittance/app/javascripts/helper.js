import { default as $ } from 'jquery';

export default class Helper {  

   static getTransactionReceiptMined(txnHash, interval) {
      var self = this;

      var transactionReceiptAsync;
      interval = interval ? interval : 500;
      transactionReceiptAsync = function(txnHash, resolve, reject) {
          try {
              web3.eth.getTransactionReceipt(txnHash, (_,receipt) => {
                  if (receipt == null || receipt.blockNumber == null ) {
                      setTimeout(function () {
                          transactionReceiptAsync(txnHash, resolve, reject);
                      }, interval);
                  } else {
                      console.log(receipt);
                      resolve(receipt);
                  }
              });
          } catch(e) {
              reject(e);
          }
      };

      if (Array.isArray(txnHash)) {
          var promises = [];
          txnHash.forEach(function (oneTxHash) {
            promises.push(self.getTransactionReceiptMined(oneTxHash, interval));
          });
          return Promise.all(promises);
      } else {
          return new Promise(function (resolve, reject) {
            transactionReceiptAsync(txnHash, resolve, reject);
          });
      }
  }


  static bconcat(x,y) {
    return "0x"+x.substring(2)+y.substring(2)
  }
  static bsha3(x) {
    return web3.sha3(x, { encoding : 'hex' })
  }

}
