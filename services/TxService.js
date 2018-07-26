/** 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
*/
const Promise = require('bluebird'),
  _ = require('lodash'),
  BigNumber =require('bignumber.js');

class TxService {
  constructor(config, blockchain, alerter) {
    this.config = config;
    this.blockchain = blockchain;
    this.alerter = alerter;
    this.TRANSACTION_TIMEOUT = 2000;
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
    await channel.assertQueue(`${serviceName}_check.${address}`);
    await channel.bindQueue(`${serviceName}_check.${address}`, 'events', 
      `${serviceName}_balance.${address}`
    );

    let count = 0;
    return await new Promise(res => channel.consume(`${serviceName}_check.${address}`, async (message) => {
      count++;
      if (count == maxCount) {
        const c  = JSON.parse(message.content);
        res(c);
        await channel.cancel(message.fields.consumerTag);
      }
    }, {noAck: true}));
  }

  countConfirms (msgs) {
    return _.filter(msgs, m => this.blockchain.getBlockNumberFromMessage(m) > -1).length;
  }

  async getMessageTransaction(countConfirmMsg) {
    const channel = await this.config.createChannel();
    const serviceName = this.config.getServiceName();
    await channel.assertExchange('events', 'topic', {durable: false});
    await channel.assertQueue(`${serviceName}_check.block`);
    await channel.bindQueue(`${serviceName}_check.block`, 'events', 
      `${serviceName}_transaction.*`
    );

    const msgs = [];
    return await new Promise(res => channel.consume(`${serviceName}_check.block`, async (message) => {
      const c = JSON.parse(message.content);
      
      const messageTx = this.blockchain.getTxFromMessage(c);
      const isSendedTx = (this.tx && messageTx.getId() == this.tx.getId());

      if (isSendedTx) {
        msgs.push(c);
        if (this.countConfirms(msgs) == countConfirmMsg) {
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
        await this.alerter.info('send transfer token transaction ' + this.tx.getId());
      })(),
      (async () => {
        const firstTx = await this.getMessageTransaction(1);
        this.startTransactionTimer();
        
        const txs = await this.getMessageTransaction(3);
        await this.alerter.expect(
          await this.blockchain.checkTxs(_.merge([firstTx], txs)),
          true,
          'check 4 rmq message  about token unconfirmed and confirmed transaction ' +
          this.tx.getId()
        );
    
        const newBalances = this.initNewBalances(initBalances, 
          this.config.getOther('tokenAmount')
        );
    
        await Promise.all(
          this.checkTokenBalanceMessage(
            accounts[0], newBalances[0], 
            initBalances[0], 'sender'
          ),
          this.checkTokenBalanceMessage(
            accounts[1], newBalances[1], 
            initBalances[1], 'recipient'
          )
        );
        await Promise.all(
          this.checkTokenBalanceThroughRest(
            accounts[0], newBalances[0], initBalances[0], 'sender'
          ),
          this.checkTokenBalanceThroughRest(
            accounts[1], newBalances[1], initBalances[1], 'recipient'
          )
        );
    
        this.stopTransactionTimer();

      })()
    ]);
  }

  async checkTokenBalanceMessage(token, account, newBalance, initBalance, side) {
    const countMessages = this.blockchain.getBalanceMessageCount();
    const balance = await this.blockchain.getTokenBalanceFromMessage(
      await this.getMessageBalance(account, countMessages),
      token
    );
    this.alerter.expect(
      balance, newBalance, 
      'check rmq message about update token balance on ' + side + ' with init=' +
      initBalance
    );
  }

  async checkTokenBalanceThroughRest(token, account, newBalance, initBalance, side) {
    const balance = await this.blockchain.getTokenBalance(account, token);
    this.alerter.expect(
      balance.toString(), newBalance.toString(), 
      'check token balance on ' + side + ' from rest with init=' + initBalance
    );
  }
  

  async checkBalanceMessage(account, newBalance, initBalance, side) {
    const countMessages = this.blockchain.getBalanceMessageCount();
    const balance = await this.blockchain.getBalanceFromMessage(
      await this.getMessageBalance(account, countMessages)
    );
    await this.alerter.expect(
      balance.toString(), newBalance.toString(), 
      'check rmq message about balance on ' + side + ' with init=' + initBalance + ' with new=' + balance
    );
  }

  async checkBalanceThroughRest(account, newBalance, initBalance, side) {
    const balance = await this.blockchain.getBalance(account);
    await this.alerter.expect(
      balance.toString(), newBalance.toString(), 
      'check balance ' + side + ' from rest with init=' + initBalance + ' with new=' + balance.toString()
    );
  }

  startTransactionTimer() {
    this.TRANSACTION_TIMEOUT = 300000;
    this.alerter.info('start all timer for ' + this.TRANSACTION_TIMEOUT);
    this.transactionTimer = setTimeout(() => {
      this.alerter.error('not update balance after ' + this.TRANSACTION_TIMEOUT + 'secs');
    }, this.TRANSACTION_TIMEOUT);
  }

  startBlockTimer() {
    this.BLOCK_TIMEOUT = 2000;
    this.alerter.info('start block timer for ' + this.BLOCK_TIMEOUT);
    this.blockTimer = setTimeout(() => {
      this.alerter.error('not update balance after  block generated' + this.BLOCK_TIMEOUT + 'secs');
    }, this.BLOCK_TIMEOUT);
  }

  stopBlockTimer() {
    clearTimeout(this.blockTimer)
  }

  stopTransactionTimer() {
    clearTimeout(this.transactionTimer);
  }

  async checkTransferTransaction(accounts) {
    const initBalances = await this.getInitBalances(accounts);
    await Promise.all([
      (async () => {
        this.startTransactionTimer();
        const txs = await this.getMessageTransaction(2);
        await this.alerter.expect(
          await this.blockchain.checkTxs(txs),
          true,
          'get 2 rmq messages about confirmed transaction: ' + 
          this.tx.getId()
        );
        this.startBlockTimer();


        const newBalances = this.initNewBalances(initBalances, 
          this.config.getTransferAmount()
        );

        await Promise.all([
          this.checkBalanceMessage(accounts[0], newBalances[0], initBalances[0], 'sender'),
          this.checkBalanceMessage(accounts[1], newBalances[1], initBalances[1], 'recipient')
        ]);
        await Promise.all([
          this.checkBalanceThroughRest(accounts[0], newBalances[0], initBalances[0], 'sender'),
          this.checkBalanceThroughRest(accounts[1], newBalances[1], initBalances[1], 'recipient')
        ]);

        this.stopBlockTimer();
        this.stopTransactionTimer();

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
