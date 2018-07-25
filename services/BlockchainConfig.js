/** 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
*/
const bunyan = require('bunyan'),
  _ = require('lodash')
  log = bunyan.createLogger({name: 'checkbot.config'}),
  amqp = require('amqplib');
class Config {

  constructor(addressFrom, addressTo, amount, serviceName, rabbitUri, restPort) {

    this.accounts = [addressFrom, addressTo];
    this.amount = amount;
    this.serviceName = serviceName;
    this.rabbitUri = rabbitUri;
    this.restPort = restPort;
    this.other = {};
  }

  getSignature()
  {
    return 'Signature 0x3878e330b384e83f614a621c57efedd2eef98eef609db5a3d1f1f8da1e79829f42f141a853951ad065f928334194e38ea056c45b5a5ee195e9d3da290202593a1b';
  }

  setOther(name, value) {
      this.other[name] = value;
  }

  setLaborxUrl(value) {
    this.laborxUrl = value;
  }

  getLaborxUrl() {
    return this.laborxUrl;
  }


  setEthKey(key) {
    this.ethKey = key;
  }

  getEthKey() {
    return this.ethKey;
  }

  getOther(name, def = null) {
    return _.get(this.other, name, def);
  }

  setNetwork(network) {
    this.network = network;
  }

  getNetwork() {
    return this.network;
  }

  setTokenName(tokenName) {
    this.tokenName = tokenName;
  }

  getTokenName() {
    return this.tokenName;
  }

  setTokenAmount(tokenAmount) {
    this.tokenAmount = tokenAmount;
  }

  getTokenAmount() {
    return this.tokenAmount;
  }

  setTokenAccount(tokenAccount) {
    this.tokenAccount = tokenAccount;
  }

  getTokenAccount() {
    return this.tokenAccount;
  }
  setSymbol(symbol) {
    this.symbol = symbol;
  }

  getSymbol() {
    return this.symbol;
  }

  getAccounts() {
    return this.accounts;
  }

  setSignUrl(url) {
    this.signUrl = url;
  }

  getSignUrl() {
    return this.signUrl;
  }
  getRestPort() {
    return this.restPort;
  }

  getTransferAmount() {
    return this.amount;
  }

  async createChannel() {
    let conn = await amqp.connect(this.rabbitUri)
      .catch(() => {
      log.error('rabbitmq is not available!');
      process.exit(0);
    });
    return await conn.createChannel();
  }


  async createProfileChannel() {
    let conn = await amqp.connect(this.rabbitUri)
      .catch(() => {
      log.error('rabbitmq is not available!');
      process.exit(0);
    });
    return await conn.createChannel();
  }

  getServiceName() {
    return this.serviceName;
  }

  setRestUrl(restUrl) {
    this.restUrl = restUrl;
  }

  getRestUrl() {
    return this.restUrl;
  }
}

module.exports  = Config;
