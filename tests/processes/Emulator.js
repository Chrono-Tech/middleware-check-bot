/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const express = require('express'),
  _ = require('lodash')
  amqp = require('amqplib'),
  app = express();


const initConfig = (env, symbol) => {
    const symbolConfig = _.get(env, symbol, '');
  
    const parts = _.chain(symbolConfig).split(',').map(a => a.split('@')).fromPairs().value()
    const config = {
      from: parts['from'], //addressFrom
      to: parts['to'], //addressTo
      amount: parts['amount'], //amount
      rabbitPrefix: parts['rabbitPrefix'], //serviceName
      rabbitUrl: parts['rabbitUrl'], //rabbitUri
      restPort: parts['restPort'] //restPort
    };
    config.restUrl = parts['restUrl'];

    config.laborxUrl = env.LABORX_URL;
    config.signature = env.LABORX_SIGNATURE;
    config.laborxRabbit = env.LABORX_RABBIT;

    config.ethKey = env.ETH_PUBLIC_KEY;
    config.symbol = symbol;
    _.chain(parts)
        .omit(['from', 'to', 'amount', 'rabbitPrefix', 'rabbitUrl', 'restPort'])
        .toPairs().value()
        .forEach(p => config[`${p[0]}`] = p[1]);
    config.signUrl = env.SIGN_URL;
    return config;
};


class Emulator {

  constructor(env, symbol) {
    this.config = initConfig(env, symbol);
    this.stage = 'empty';
  }


  balanceFromStageForTo (stage) {
    if (stage == 'register') 
      return {
        balance: 0
      };
    return {
      balance: this.config.amount
    };
  }
  
  balanceFromStageForFrom (stage) {
    if (stage == 'register') 
      return {
        balance: this.config.amount
      };
    return {
      balance: 0
    };
  }
  
  signTransaction () {
    return {
      signature: 'sdfsdfsdfsdf'
    };
  }
  
  sendTransaction () {
    return {
      id: 5677
    }
  }


  getBalanceMessageCount() {
    return 2;
  }

  createConfirmedTx() {
    return {
      id: 5677,
      blockNumber: 10
    };
  }

  getSymbol() {
    return 'waves';    
  }

  start() {
    // respond with "hello world" when a GET request is made to the homepage
    app.post('/api/v1/security/signin/signature/chronomint', (req, res) => {
      console.log('signup');
      this.stage = 'register';
      res.send({
        'token': 'sdfsdfsdfsdfsdfsdfsdfsdfsdfsd'
      });
    });

    app.get(`/addr/${this.config.from}/balance`, (req, res) => {
      console.log('get balance from');
      res.send(this.balanceFromStageForFrom(this.stage, this.config.from));
    });

    app.get(`/addr/${this.config.to}/balance`, (req, res) => {
      console.log('get balance to');
      res.send(this.balanceFromStageForTo(this.stage, this.config.to));
    });

    app.post('/sign/' + this.getSymbol() + '/*' , (req, res) => {
      console.log('tx_sign');
      res.send(this.signTransaction());
    });


    app.post('/tx/send', async (req, res) => {
      console.log('tx_send');
      this.stage = 'update';
      res.send(this.sendTransaction());

      await this.sendMessageTransaction();
      await this.sendMessageTransaction();


      await this.sendBalanceMessageTransaction();
      await this.sendBalanceMessageTransaction();


    });

    app.listen(this.config.restPort, () => {
      console.log('proxy listening on port ' + this.config.restPort  + '!');
    });
  }

  async createProfileChannel () {
    let conn = await amqp.connect(this.config.laborxRabbit);
    return await conn.createChannel();
  }

  async createChannel() {
    let conn = await amqp.connect(this.config.rabbitUrl);
    return await conn.createChannel();
  }

  async sendMessageTransaction() {
    const channel = await this.createChannel();
    const info = this.createConfirmedTx();
    await channel.publish('events', `${this.config.rabbitPrefix}_transaction.1112`, 
      new Buffer(JSON.stringify(info))
    );
    console.log('send msg transaction', `${this.config.rabbitPrefix}_transaction.1112`);
  
  }

  async sendBalanceMessageTransaction() {
    const channel = await this.createChannel();

    let info = this.balanceFromStageForFrom('update')
    await channel.publish(
      'events', `${this.config.rabbitPrefix}_balance.${this.config.from}`, 
      new Buffer(JSON.stringify(info))
    );
    console.log('send msg balance from transaction');


    info = this.balanceFromStageForTo('update')
    await channel.publish(
      'events', `${this.config.rabbitPrefix}_balance.${this.config.to}`, 
      new Buffer(JSON.stringify(info))
    );
    console.log('send msg balance to transaction');
  }


};

module.exports = Emulator;






