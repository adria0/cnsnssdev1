// Import libraries we need.
import { default as Web3 } from 'web3';
import { default as contract } from 'truffle-contract'
import { default as Helper } from './helper.js';
import { default as $ } from 'jquery';
import { default as toastr } from 'toastr';
import { default as bip39 } from 'bip39';

// Import our contract artifacts and turn them into usable abstractions.
import remittanceArtifact from '../../build/contracts/Remittance.json'

const TOPIC_LOGDIPOSIT = web3.sha3("LogDiposit(bytes32,uint256)")
const TOPIC_LOGBINDED  = web3.sha3("LogBinded(bytes32,address)")
const TOPIC_LOGPAID    = web3.sha3("LogPaid(bytes32,address,uint256)")
const TOPIC_LOGCLAIMED = web3.sha3("LogClaimed(bytes32)")

export default class BettingonDApp {

  constructor() {    
      this._Remittance = contract(remittanceArtifact);
      this._Remittance.setProvider(web3.currentProvider);

      $('#uiSenderCreatePayment').click(() => this.uiSenderCreatePayment())
      $('#uiReciverCalcAuth').click(() => this.uiReciverCalcAuth())
      $('#uiExchangeBind').click(()=>this.uiExchangeBind())
      $('#uiExchangeWithdraw').click(()=>this.uiExchangeWithdraw())
  }

  async start() {

    var self = this;

    web3.eth.getAccounts(async function(err, accs) {

      if (err != null) {
        alert("There was an error fetching your accounts.");
        return;
      }

      if (accs.length == 0) {
        alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
        return;
      }

      self._accounts = accs;
      self._account = accs[0];

      self._r = await self._Remittance.deployed();    
    })

  }
  setStatus(message,working) {
    if (working) message+="<img height=40 width=40 src='https://s-media-cache-ak0.pinimg.com/originals/d9/93/3c/d9933c4e2c272f33b74ef18cdf11a7d5.gif'>"
    $('#status').html(message);
  }

  doTransaction(promise) {
    var self = this;

    return promise
    .then ( (tx) => {
      self.setStatus("Waiting network...",true);
      console.log("tx "+tx.tx);
      return Helper.getTransactionReceiptMined(tx.tx);     
    }).then ( receipt  => {
      self.setStatus("Success",false);

      let topics = []
      for (let rn = 0; rn < receipt.logs.length; rn++) {
        for (let tn = 0; tn < receipt.logs[rn].topics.length; tn++) {
          topics.push(receipt.logs[rn].topics[tn])
        }
      }
      return new Promise((resolve, reject)=>{resolve(topics)})
    }).catch ( (e) => {
      console.log(e);
      self.setStatus("Failed",false);
    })

  }
  uiSenderCreatePayment() {

      const amount = web3.toWei($('#amount').val(),'ether')
      if (amount==0) return;

      const bip39exchange = bip39.generateMnemonic()
      const bip39reciver  = bip39.generateMnemonic()

      const kexchange = "0x" + bip39.mnemonicToSeedHex(bip39exchange).substring(0,64)
      const kreciver  = "0x" + bip39.mnemonicToSeedHex(bip39reciver).substring(0,64)

      const metProof         = Helper.bsha3(Helper.bconcat(kexchange,Helper.bsha3(kreciver)))
      const paymentProof     = Helper.bsha3(Helper.bconcat(kexchange,kreciver))
      const metChallange     = Helper.bsha3(metProof)
      const paymentChallange = Helper.bsha3(paymentProof)

      $('#sender_bip39exchange').val(bip39exchange)
      $('#sender_bip39reciver').val(bip39reciver)
      $('#reciver_bip39reciver').val(bip39reciver)
      $('#exchange_bip39exchange').val(bip39exchange)
      $('#exchange_bip39reciver').val(bip39reciver)

      this.doTransaction(
        this._r.diposit(
          metChallange, paymentChallange, 3600,
          {from: this._account, value : amount }
        )
      ).then ( topics => {
        if (topics.indexOf(TOPIC_LOGDIPOSIT) != -1) {
            toastr.info('Success');
        } else {
            toastr.error('Something wrong happened');
        }
     })
  }

  uiReciverCalcAuth() {

      const bip39reciver = $('#reciver_bip39reciver').val()
      const kreciver  = "0x" + bip39.mnemonicToSeedHex(bip39reciver).substring(0,64)
      const bip39authcode = bip39.entropyToMnemonic(Helper.bsha3(kreciver).substring(2))

      $('#reciver_bip39authcode').val(bip39authcode)
      $('#exchange_bip39authcode').val(bip39authcode)
  }

  uiExchangeBind() {

      const bip39authcode = $('#exchange_bip39authcode').val()
      const authcode = "0x"+bip39.mnemonicToEntropy(bip39authcode)

      const bip39exchange = $('#exchange_bip39exchange').val()
      const kexchange = "0x" + bip39.mnemonicToSeedHex(bip39exchange).substring(0,64)

      const metProof = Helper.bsha3(Helper.bconcat(kexchange,authcode))

      this.doTransaction(
        this._r.bind(
          metProof,
          {from: this._account }
        )
      ).then ( topics => {
        if (topics.indexOf(TOPIC_LOGBINDED) != -1) {
            toastr.info('Success');
        } else {
            toastr.error('Something wrong happened');
        }
     })

  }

  uiExchangeWithdraw() {

      const bip39authcode = $('#exchange_bip39authcode').val()
      const authcode = "0x"+bip39.mnemonicToEntropy(bip39authcode)

      const bip39exchange = $('#exchange_bip39exchange').val()
      const kexchange = "0x" + bip39.mnemonicToSeedHex(bip39exchange).substring(0,64)

      const metProof = Helper.bsha3(Helper.bconcat(kexchange,authcode))
      
      const bip39reciever = $('#exchange_bip39reciver').val()
      const kreciver = "0x" + bip39.mnemonicToSeedHex(bip39reciever).substring(0,64)

      const paymentProof = Helper.bsha3(Helper.bconcat(kexchange,kreciver))

      this.doTransaction(
        this._r.withdraw(
          metProof,paymentProof,
          {from: this._account }
        )
      ).then ( topics => {
        if (topics.indexOf(TOPIC_LOGPAID) != -1) {
            toastr.info('Success');
        } else {
            toastr.error('Something wrong happened');
        }
     })

  }
}
