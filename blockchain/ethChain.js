/** 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
*/
const request = require('request-promise'),
  _ = require('lodash'),
  Tx = require('../models/Tx');

class EthChain {

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
    const info = {'eth-address': address, user: 1};
    await channel.publish('profiles', 'address.deleted.waves-address', new Buffer(JSON.stringify(info)));
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
      json: {
        purpose: "middleware",
        addresses: [
          {
            type: "ethereum-public-key",
            value: this.config.getEthKey()
          },
          {
            type: "eth-address",
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
    const nonce = await request({
        url: `http://${this.config.getRestUrl()}:${this.config.getRestPort()}/addr/${addrFrom}/nonce`,
        method: 'GET'
    });
    if (nonce.code) {
        throw new Error(nonce.message || nonce);
    }
    const transferData = {
        nonce: parseInt(nonce),
      "chainId": 3,
      "to": addrTo, 
      gas: this.config.getOther('gas', null),
      gasLimit: this.config.getOther('gasLimit', null),
      gasPrice: this.config.getOther('gasPrice', null),
      "value": amount
    };
    const signUrl = this.config.getSignUrl();
    const signTx = await request({
      url: `${signUrl}/sign/eth/${addrFrom}`,
      method: 'POST',
      json: transferData
    });

    if (!signTx.hex) {
        throw new Error(signTx.message);
    }
    logger('sign transaction ' + signTx.hex);

    const tx = await request({
      url: `http://${this.config.getRestUrl()}:${this.config.getRestPort()}/tx/send`,
      method: 'POST',
      json: signTx
    });
    if (!tx.hash) {
        throw new Error(tx.message || tx);
    }
    return new Tx(tx.hash);
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
      json: true
    });

    return content.balance;
  }

  getTxFromMessage(message) {
    return new Tx(message.hash);
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
    // const content = await request({
    //   url: `http://${this.config.getRestUrl()}:${this.config.getRestPort()}/addr/${address}/balance`,
    //   method: 'GET',
    //   json: true
    // });

    // return _.find(content.erc20, asset => asset.id == tokenName).balance;
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
    // return message.balance;
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
  async sendTokenTransaction(addrFrom, addrTo, tokenName, amount, logger) {

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
    return (output['confirmed'] == 2 && output['unconfirmed'] == 2);
  }



}

module.exports = EthChain;
