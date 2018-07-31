/** 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
*/
var _ = require('lodash'),
  amqp = require('amqplib');
class AlerterMock {

  constructor(rabbitUrl) {
    this.rabbitUrl = rabbitUrl
  }

  async init() {

  }

  async createChannel() {
    let conn = await amqp.connect(this.rabbitUrl);
    return await conn.createChannel();
  }

  async sendMessage(message) {
    const channel = await this.createChannel();
    await channel.assertExchange('test', 'fanout', {durable: false});

    console.log(message);
    await channel.publish('test', `alert`, 
      new Buffer(JSON.stringify({message}))
    );
  }

  async info(message) {
    await this.sendMessage('SUCCESS! ' + message);
  }

  async expect(res, compareRes, message) {
    if (_.isEqual(res, compareRes)) {
      return await this.info(message);
    }
    await this.sendMessage('FAILURE! ' + message);
  }

  async error(message) {
    await this.sendMessage('FAILURE! ' + message);
  }
}

module.exports = AlerterMock;
