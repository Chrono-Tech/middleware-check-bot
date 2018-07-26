/** 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
*/
const request = require('request-promise'),
      _ = require('lodash'),
      Tx = require('../models/Tx');
class WavesChain {

  constructor(blockchainConfig) {
    this.config = blockchainConfig;
  }

  /**
   * 
   * @param {String} address 
   * 
   * @memberOf WavesChain
   */
  async deleteAccount(address) {
    const channel = await this.config.createProfileChannel();
    const info = {'waves-address': address, user: 1};
    await channel.publish('profiles', 'address.deleted', new Buffer(JSON.stringify(info)));
  }

  /**
   * 
   * @param {String} address 
   * 
   * @memberOf WavesChain
   */
  async registerAccount(address) {
    const response = await request({
      url: `${this.config.getLaborxUrl()}/signin/signature/chronomint`,
      method: 'POST',
      headers: {
        Authorization: this.config.getSignature()
      },
      json: {
        purpose: "middleware",
        addresses: [
          {
            type: "ethereum-public-key",
            value: this.config.getEthKey()
          },
          {
            type: "waves-address",
            value: address
          }
        ]
      }
    });
    this.token = response.token;
    if (!this.token) {
      throw new Error('Not found token from post accounts');
    }
  }


  getBalanceMessageCount() {
    return 2;
  }

  getHeaders() {
    return {
      'Authorization': 'Bearer ' + this.token
    };
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
      url: `http://${this.config.getRestUrl()}:${this.config.getRestPort()}/addr/${address}/balance`,
      method: 'GET',
      headers: this.getHeaders(),
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
   * @param {Function} logger
   * 
   * @return {models/Tx} Tx
   * 
   * @memberOf WavesChain
   */
  async sendTransferTransaction(addrFrom, addrTo, amount, logger) {
    const transferData = {
      // An arbitrary address; mine, in this example
      recipient: addrTo,
      // The real amount is the given number divided by 10^(precision of the token)
      amount: parseInt(amount),
      // The same rules for these two fields
      assetId: null,
      feeAssetId: null,
      //feeAsset: 0,
      fee: 100000,
      // 140 bytes of data (it's allowed to use Uint8Array here)
      attachment: '',
      timestamp: Date.now()
    };
    const signUrl = this.config.getSignUrl();
    const signTx = await request({
      url: `${signUrl}/sign/waves/${addrFrom}`,
      method: 'POST',
      headers: this.getHeaders(),
      json: transferData
    });

    if (!signTx.signature) {
        throw new Error(signTx.message);
    }
    logger('sign transaction ' + signTx.signature);

    const tx = await request({
      url: `http://${this.config.getRestUrl()}:${this.config.getRestPort()}/tx/send`,
      method: 'POST',
      headers: this.getHeaders(),
      json: signTx
    });
    if (!tx.id) {
        throw new Error(tx.message || tx);
    }
    return new Tx(tx.id);
  }


  getTxFromMessage(message) {
    return new Tx(message.id);
  }

    /**
   * 
   * 
   * @param {String} address 
   * @return {Number}
   * 
   * @memberOf WavesChain
   */
  async getTokenBalance(address, tokenName) {
    const content = await request({
      url: `http://${this.config.getRestUrl()}:${this.config.getRestPort()}/addr/${address}/balance`,
      method: 'GET',
      headers: this.getHeaders(),
      json: true
    });

    return _.find(content.assets, asset => asset.id == tokenName).balance;
  }

  /**
   * 
   * 
   * @param {Object} message 
   * @return {Number}
   * 
   * @memberOf WavesChain
   */
  async getTokenBalanceFromMessage(message, tokenName) {
    return message.assets[tokenName];
  }

    /**
   * 
   * 
   * @param {String} addrFrom 
   * @param {String} addrTo 
   * @param {Number} amount
   * @param {Function} logger
   * 
   * @return {models/Tx} Tx
   * 
   * @memberOf WavesChain
   */
  async sendTokenTransaction(addrFrom, addrTo, token, amount, logger) {
    const transferData = {
      type: 4,
      fee: 100000,
      timestamp: Date.now(),
      recipient: addrTo,
      assetId: token,
      amount: amount,
      sender: addrFrom,
      feeAsset: null,
      attachment: '' 
    };
    

    const signUrl = this.config.getSignUrl();
    const signTx = await request({
      url: `${signUrl}/sign/waves/${addrFrom}`,
      headers: this.getHeaders(),
      method: 'POST',
      json: transferData
    });

    if (!signTx.signature) {
        throw new Error(signTx.message);
    }
    logger('sign transaction ' + signTx.signature);

    
    const tx = await request({
      url: `http://${this.config.getRestUrl()}:${this.config.getRestPort()}/tx/send`,
      method: 'POST',
      headers: this.getHeaders(),
      json: signTx
    });

    if (!tx.id) {
        throw new Error(tx.message || tx);
    }

    return new Tx(tx.id);
  }

  /**
   * 
   * @param {Object} contentTx 
   * @return {Boolean}
   * 
   * @memberOf WavesChain
   */
  async checkTxs(contentTxs) {
    if (contentTxs.length == 0) 
      return false;
    
    const output = contentTxs.reduce((result, tx) => {
      if (tx.blockNumber == -1)
        result['unconfirmed']++;
      if (tx.blockNumber > 0)
        result['confirmed']++;
      return result;     
    }, {'confirmed': 0, 'unconfirmed': 0});
    return (output['confirmed'] == 2);
  }

 

}

module.exports = WavesChain;
