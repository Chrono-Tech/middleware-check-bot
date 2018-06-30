/** 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
*/
const request = require('request-promise');
class BitcoinChain {

  constructor(blockchainConfig) {
    this.config = blockchainConfig;
  }

  /**
   * 
   * @param {String} address 
   * 
   * @memberOf WavesChain
   */
  async registerAccount(address) {
    await request({
      url: `http://localhost:${this.config.getRestPort()}/addr/`,
      method: 'POST',
      json: {address: address}
    });
  }

  /**
   * 
   * 
   * @param {String} address 
   * @return {Number}
   * 
   * @memberOf WavesChain
   */
  async getBalance(address) {
    const content = await request({
      url: `http://localhost:${this.config.getRestPort()}/addr/${address}/balance`,
      method: 'GET',
      json: true
    });

    return content.balance;
  }

  /**
   * 
   * 
   * @param {Object} message 
   * @return {Number}
   * 
   * @memberOf WavesChain
   */
  async getBalanceFromMessage(message) {
    return message.balance;
  }

  /**
   * 
   * 
   * @param {String} addrFrom 
   * @param {String} addrTo 
   * @param {Number} amount 
   * 
   * @return {models/Tx} Tx
   * 
   * @memberOf WavesChain
   */
  async sendTransferTransaction(addrFrom, addrTo, amount) {
    const utxo = await request({
      url: `${this.config.getSignUrl()}/utxo/${addrFrom}/utxo`,
      method: 'GET',
    });
    if (utxo.length == 0)
      throw new Error('for bitcoin utxo for accounts empty')

    const initBalance =  this.getBalance(addrFrom);

    const transferData = {
      "inputs" : [
        {
          "txId": utxo[0].txid, 
          "vout": utxo[0].vout
        }
      ], "outputs": [
        {
          "address": addrFrom, 
          "value": initBalance-amount-100
        },
        {
          "address": addrTo, 
          "value": amount
        }
      ]
    };

    const signTx = await request({
      url: `${this.config.getSignUrl()}/sign/bitcoin/${addrFrom}`,
      method: 'POST',
      json: transferData
    });

    return await request({
      url: `http://localhost:${this.config.getRestPort()}/tx/send`,
      method: 'POST',
      json: signTx
    });
  }

  /**
   * 
   * @param {Object} contentTx 
   * @return {Boolean}
   * 
   * @memberOf WavesChain
   */
  async checkUnconfirmedTx(contentTx) {
    return contentTx.blockNumber == -1;
  }

  /**
   * 
   * @param {Object} contentTx 
   * @return {Boolean}
   * 
   * @memberOf WavesChain
   */
  async checkConfirmedTx(contentTx) {
    return contentTx.blockNumber > 0;
  }


}

module.exports = BitcoinChain;
