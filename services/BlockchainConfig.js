/** 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
*/
const bunyan = require('bunyan'),
  log = bunyan.createLogger({name: 'checkbot.config'}),
  amqp = require('amqplib');
class Config {

  constructor(addressFrom, addressTo, amount, serviceName, rabbitUri, restPort) {

    this.accounts = [addressFrom, addressTo];
    this.amount = amount;
    this.serviceName = serviceName;
    this.rabbitUri = rabbitUri;
    this.restPort = restPort;
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

  getServiceName() {
    return this.serviceName;
  }
}

module.exports  = Config;