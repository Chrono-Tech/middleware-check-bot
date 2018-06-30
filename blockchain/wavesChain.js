/** 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
*/
const request = require('request-promise'),
      Promise = require('bluebird'),
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
  async registerAccount(address) {
    const b = await request({
      url: `http://localhost:${this.config.getRestPort()}/addr/`,
      method: 'POST',
      json: {address: address}
    });
    console.log(b);
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
    const transferData = {
      // An arbitrary address; mine, in this example
      recipient: addrTo,
      // ID of a token, or WAVES
      assetId: null,
      // The real amount is the given number divided by 10^(precision of the token)
      amount: parseInt(amount),
      // The same rules for these two fields
      feeAsset: null,
      fee: 100000,
      // 140 bytes of data (it's allowed to use Uint8Array here)
      attachment: '',
      timestamp: Date.now()
    };

    const signUrl = this.config.getSignUrl();
    const signTx = await request({
      url: `${signUrl}/sign/waves/${addrFrom}`,
      method: 'POST',
      json: transferData
    });

    if (!signTx.signature) {
        throw new Error(signTx.message);
    }
    const tx = await request({
      url: `http://localhost:${this.config.getRestPort()}/tx/send`,
      method: 'POST',
      json: signTx
    });
  /*const tx = await request({
    method: 'POST',
    uri: 'http://localhost:6869/assets/broadcast/transfer',
    json: signTx
  });*/
    if (!tx.id) {
        throw new Error(tx.message || tx);
    }
    return new Tx(tx.id);
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
      url: `http://localhost:${this.config.getRestPort()}/addr/${address}/balance`,
      method: 'GET',
      json: true
    });

    return content.assets[tokenName];
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
   * 
   * @return {models/Tx} Tx
   * 
   * @memberOf WavesChain
   */
  async sendTokenTransaction(addrFrom, addrTo, token, amount) {
    const transferData = {
        type: 4,
                sender: addrFrom,
                    fee: 100000,
                      timestamp: Date.now(),
                          recipient: addrTo,
                            assetId: token,
                              amount: 100,
                                feeAsset: null,
                                  attachment: 'string' 
    };

    const signUrl = this.config.getSignUrl();
    const signTx = await request({
      url: `${signUrl}/sign/waves/${addrFrom}`,
      method: 'POST',
      json: transferData
    });

    if (!signTx.signature) {
        throw new Error(signTx.message);
    }
    if (!signTx.signature) {
        throw new Error(signTx.message);
    }
    const tx = await request({
      url: `http://localhost:${this.config.getRestPort()}/tx/send`,
      method: 'POST',
      json: signTx
    });
    if (!tx.id) {
        throw new Error(tx.message || tx);
    }
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

module.exports = WavesChain;
