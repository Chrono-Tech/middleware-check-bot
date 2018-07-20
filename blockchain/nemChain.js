/** 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
*/
const request = require('request-promise'),
      _ = require('lodash'),
      Tx = require('../models/Tx');
class NemChain {

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
      json: {addresses: {
        'nem-address': address,
        'eth-public-key': this.config.getEthKey()
      }}
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
    return content.balance.confirmed.amount;
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
    return message.balance.confirmed.amount;
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
      amount,
      "recipient": addrTo,
      "recipientPublicKey": "",
      "isMultisig": false,
      "timeStamp": Date.now(),
      "multisigAccount": "",
      "message": "Hello",
      "messageType": 1,
      "version": parseInt(this.config.getOther('network')),
      "mosaics": [] 
    };

    const signTx = await request({
      url: `${this.config.getSignUrl()}/sign/nem/${addrFrom}`,
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
      json: {signature: signTx.signature, data: _.omit(signTx, 'signature')}
    });
    if (!tx.meta || !tx.meta.hash.data) {
      throw new Error(tx.message || tx);
    }
    return new Tx(tx.meta.hash.data);
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
    const token = this.prepareToken(tokenName);
    const content = await request({
      url: `http://${this.config.getRestUrl()}:${this.config.getRestPort()}/addr/${address}/balance`,
      method: 'GET',
      json: true
    });

    return content.mosaics[token.name].confirmed.value;
  }

  getTxFromMessage(message) {
    return new Tx(message.hash);
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
    const token = this.prepareToken(tokenName);
    return message.mosaics[token.name].confirmed.value;
  }

  prepareToken(token) {
    const parts = token.split('@');
    return {
      namespaceId: token[0],
      name: token[1]
    };
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
    const token = this.prepareToken(tokenName);
    const transferData = {
      amount,
      "recipient": addrTo,
      "recipientPublicKey": "",
      "isMultisig": false,
      "timeStamp": Date.now(),
      "multisigAccount": "",
      "message": "Hello",
      "messageType": 1,
      "version": parseInt(this.config.getNetwork()),
      "mosaics": [
        {
          mosaicId: {
            namespaceId: token.namespace,
            name: token.name
          },
          quantity: amount
        }
      ] 
    };

    const signTx = await request({
      url: `${this.config.getSignUrl()}/sign/nem/${addrFrom}`,
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
      json: {signature: signTx.signature, data: _.omit(signTx, 'signature')}
    });
    if (!tx.meta || !tx.meta.hash.data) {
      throw new Error(tx.message || tx);
    }
    return new Tx(tx.meta.hash.data);
}


getBalanceMessageCount() {
  return 2;
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

module.exports = NemChain;
