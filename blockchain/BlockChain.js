/** 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
*/
const request = require('request-promise'),
      _ = require('lodash'),
      Tx = require('../models/Tx');
class BlockChain {

  /**
   * 
   * @param {String} address 
   * 
   * @memberOf WavesChain
   */
  async deleteAccount(address) {
  }

  /**
   * 
   * @param {String} address 
   * 
   * @memberOf WavesChain
   */
  async registerAccount(address) {
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

  }

  /**
   * 
   * @param {Object} contentTx 
   * @return {Boolean}
   * 
   * @memberOf WavesChain
   */
  async checkTxs(contentTxs) {
  }

  getBlockNumberFromMessage(message) {
    return message.blockNumber;
  }

 

}

module.exports = BlockChain;
