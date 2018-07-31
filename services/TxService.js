/** 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
*/
const Promise = require('bluebird'),
  BigNumber =require('bignumber.js');

class TxService {
  constructor(config, blockchain, alerter) {
    this.config = config;
    this.blockchain = blockchain;
    this.alerter = alerter;
  }

  async getInitBalances(accounts) {
    return await Promise.mapSeries(accounts, async account => 
      await this.blockchain.getBalance(account)
    );
  }

  async getInitTokenBalances(accounts, tokenName) {
    return await Promise.mapSeries(accounts, async account => 
      await this.blockchain.getTokenBalance(account, tokenName)
    );
  }

  async getMessageBalance(address, maxCount = 2) {
    const channel = await this.config.createChannel();
    const serviceName = this.config.getServiceName();
    await channel.assertExchange('events', 'topic', {durable: false});
    await channel.assertQueue(`${serviceName}_test.${address}`);
    await channel.bindQueue(`${serviceName}_test.${address}`, 'events', 
      `${serviceName}_balance.${address}`
    );

    let count = 0;
    return await new Promise(res => channel.consume(`${serviceName}_test.${address}`, async (message) => {
      count++;
      if (count == maxCount) {
        res(JSON.parse(message.content));
        await channel.cancel(message.fields.consumerTag);
      }
    }, {noAck: true}));
  }

  async getMessageTransaction(countMsg) {
    const channel = await this.config.createChannel();
    const serviceName = this.config.getServiceName();
    await channel.assertExchange('events', 'topic', {durable: false});
    await channel.assertQueue(`${serviceName}_test.block`);
    await channel.bindQueue(`${serviceName}_test.block`, 'events', 
      `${serviceName}_transaction.*`
    );

    const msgs = [];
    return await new Promise(res => channel.consume(`${serviceName}_test.block`, async (message) => {
        const c = JSON.parse(message.content);
        const messageTx = this.blockchain.getTxFromMessage(c);
        const isTx = (this.tx && messageTx.getId() == this.tx.getId());
        if (isTx) {
          msgs.push(c);
          if (msgs.length == countMsg) {
            await channel.cancel(message.fields.consumerTag);
            res(msgs);
          }
        }
    }, {noAck: true}));
  }

  initNewBalances(initBalances, transferAmount) {
    return [
      new BigNumber(initBalances[0]).minus(transferAmount),
      new BigNumber(initBalances[1]).plus(transferAmount)
    ]
  }


  checkBalance(account, balance, accounts, newBalances) {
    return (
      account === accounts[0] ? 
      newBalances[0].minus(balance).toNumber() >= 0 :
      newBalances[1].minus(balance).toNumber() == 0
    );
  }
    
  async checkTokenTransaction(accounts) {
    const token = this.config.getOther('tokenName');
    const initBalances = await this.getInitTokenBalances(accounts, token);

    this.tx = null;
    await Promise.all([
      (async () => {
        this.tx = await this.blockchain.sendTokenTransaction(
          accounts[0], accounts[1], 
          token,
          this.config.getOther('tokenAmount'),
          this.alerter.info.bind(this.alerter)
        );
        await this.alerter.info('send transfer mosaic transaction ' + this.tx.getId());
      })(),
      (async () => {
        const txs = await this.getMessageTransaction(4);
        await this.alerter.expect(
          await this.blockchain.checkTxs(txs),
          true,
          'check 4 rmq message  about token unconfirmed and confirmed transaction ' + 
          this.tx.getId()
        );

        const newBalances = this.initNewBalances(initBalances, 
          this.config.getOther('tokenAmount')
        );

        await this.waitTokenBalanceMessages(token, accounts, 
          newBalances, initBalances);
        await this.checkTokenBalanceThroughRest(token, accounts, 
          newBalances, initBalances);

      })()
    ]);
  }

  async waitTokenBalanceMessages(token, accounts, newBalances, initBalances) {
    const countMessages = this.blockchain.getBalanceMessageCount();
    await (async () => {
      const balance = await this.blockchain.getTokenBalanceFromMessage(
        await this.getMessageBalance(accounts[0], countMessages),
        token
      );
      this.alerter.expect(
        balance, newBalances[0], 
        'check rmq message about update token balance on sender with init=' +
        initBalances[0]
      );
    })();

    await (async () => {
      const balance = await this.blockchain.getTokenBalanceFromMessage(
        await this.getMessageBalance(accounts[1], countMessages),
        token
      );
      this.alerter.expect(
        balance, newBalances[1], 
        'check rmq message about update token balance on recipient with init=' + 
        initBalances[1]
      );
    })();
  }

  async checkTokenBalanceThroughRest(token, accounts, newBalances, initBalances) {
    await (async () => {
      const balance = await this.blockchain.getTokenBalance(accounts[0], token);
      this.alerter.expect(
        balance.toString(), newBalances[0].toString(), 
        'check token balance on sender from rest with init=' + initBalances[0]
      );
    })();

    await (async () => {
      const balance = await this.blockchain.getTokenBalance(accounts[1], token);
      this.alerter.expect(
        balance.toString(), newBalances[1].toString(), 
        'check token balance on recipient from rest with init=' + initBalances[1]
      );
    })();
  }


  async waitBalanceMessages (accounts, newBalances, initBalances) {
    await (async () => {
      const balance = await this.blockchain.getBalanceFromMessage(
        await this.getMessageBalance(accounts[0], this.blockchain.getBalanceMessageCount())
      );
      this.alerter.expect(
        balance, newBalances[0], 
        'check rmq message about balance on sender with init=' + initBalances[0]
      );
    })();

    await (async () => {
      const balance = await this.blockchain.getBalanceFromMessage(
        await this.getMessageBalance(accounts[1], this.blockchain.getBalanceMessageCount())
      );
      this.alerter.expect(
        balance, newBalances[1], 
        'check rmq message about balance on recipient with init=' + initBalances[1]
      );
    })();
  }

  async checkBalanceThroughRest(accounts, newBalanaces, initBalances) {
    await (async () => {
      const balance = await this.blockchain.getBalance(accounts[0]);
      this.alerter.expect(
        balance.toString(), newBalances[0].toString(), 
        'check balance sender from rest with init=' + initBalances[0]
      );
    })();

    await (async () => {
      const balance = await this.blockchain.getBalance(accounts[1]);
      this.alerter.expect(
        balance.toString(), newBalances[1].toString(), 
        'check balance recipient from rest with init=' + initBalances[1]
      );
    })();
  }

  async checkTransferTransaction(accounts) {
    const initBalances = await this.getInitBalances(accounts);
    await Promise.all([
      (async () => {
        const txs = await this.getMessageTransaction(4);
        await this.alerter.expect(
          await this.blockchain.checkTxs(txs),
          true,
          'get 4 rmq messages about unconfirmed and confirmed transaction: ' + 
          this.tx.getId()
        );

        const newBalances = this.initNewBalances(initBalances, 
          this.config.getTransferAmount()
        );

        await this.waitBalanceMessages(accounts, newBalances, initBalances);
        await this.checkBalanceThroughRest(accounts, newBalances, initBalances);

      })(),
      (async () => {
        this.tx = await this.blockchain.sendTransferTransaction(
          accounts[0], accounts[1], 
          this.config.getTransferAmount(),
          this.alerter.info.bind(this.alerter)
        );
        await this.alerter.info('send transfer transaction ' + this.tx.getId());
      })()
    ]);

  }


}

module.exports = TxService;
