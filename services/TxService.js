/** 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
*/
const Promise = require('bluebird');

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

  async getMessageBalance(address) {
    const channel = await this.config.createChannel();
    const serviceName = this.config.getServiceName();
    await channel.assertExchange('internal', 'topic', {durable: false});
    await channel.assertQueue(`${serviceName}_test.${address}`);
    await channel.bindQueue(`${serviceName}_test.${address}`, 'internal', 
      `${serviceName}_balance.${address}`
    );
    return await new Promise(res => channel.consume(`${serviceName}_test.${address}`, async (message) => {
      res(JSON.parse(message.content));
      await channel.cancel(message.fields.consumerTag);
    }, {noAck: true}));
  }

  async getMessageTransaction() {
    const channel = await this.config.createChannel();
    const serviceName = this.config.getServiceName();
    await channel.assertExchange('internal', 'topic', {durable: false});
    await channel.assertQueue(`${serviceName}_test.block`);
    await channel.bindQueue(`${serviceName}_test.block`, 'internal', 
      `${serviceName}_transaction.*`
    );
    return await new Promise(res => channel.consume(`${serviceName}_test.block`, async (message) => {
      res(JSON.parse(message.content));
      await channel.cancel(message.fields.consumerTag);
    }, {noAck: true}));
  }

  initNewBalances(initBalances, transferAmount) {
    return [
      initBalances[0]-transferAmount,
      initBalances[1]+transferAmount
    ]
  }

  async getCheckBalanceMessages(accounts, newBalances) {
    return await Promise.map(accounts, async(account) => {
      const balance = await this.blockchain.getBalanceFromMessage(
        await this.getMessageBalance(account)
      );
      const balanceKey = (account == accounts[0]) ? 0 : 1;
      return balance == newBalances[balanceKey];
    });
  }

  async getCheckBalanceRests(accounts, newBalances) {
    return await Promise.map(accounts, async (account) => {
      const balance = await this.blockchain.getBalance(account);
      const balanceKey = (account == accounts[0]) ? 0 : 1;
      return balance == newBalances[balanceKey];
    });
  } 

    
  async getCheckTokenBalanceMessages(accounts, tokenName, newBalances) {
    return await Promise.map(accounts, async(account) => {
      const balance = await this.blockchain.getTokenBalanceFromMessage(
        await this.getMessageBalance(account),
        tokenName
      );
      const balanceKey = (account == accounts[0]) ? 0 : 1;
      return balance == newBalances[balanceKey];
    });
  }

  async getCheckTokenBalanceRests(accounts, tokenName, newBalances) {
    return await Promise.map(accounts, async (account) => {
      const balance = await this.blockchain.getTokenBalance(account, tokenName);
      const balanceKey = (account == accounts[0]) ? 0 : 1;
      return balance == newBalances[balanceKey];
    });
  } 



  checkTokenTransaction(accounts) {
    const initBalances = await this.getInitTokenBalances(accounts, 
      this.config.getTokenName()
    );

    let tx;
    await Promise.all([
      (async () => {
        tx = await this.blockchain.sendTokenTransaction(
          accounts[0], accounts[1], 
          this.config.getTokenName(),
          this.config.getTokenAmount()
        );
        await this.alerter.info('send token transaction ' + tx.getId());
      })(),
      (async () => {
        const contentTx = await this.getMessageTransaction();
        await this.alerter.expect(
          await this.blockchain.checkUnconfirmedTx(contentTx),
          'check unconfirmed transaction ' + tx.getId()
        );
      })(),
      (async () => {
        const contentTx = await getMessageTransaction();
        await this.alerter.expect(
          await this.blockchain.checkConfirmedTx(contentTx),
          'check confirmed transaction ' + tx.getId()
        );

        const newBalances = this.initNewBalances(initBalances, 
          this.config.getTransferAmount()
        );
        await this.alerter.expect(
          await this.getCheckTokenBalanceMessages(
            accounts, this.config.getTokenName(),
            newBalances
          ),
          [true, true],
          'check message about token update balance'
        );

        await this.alerter.expect(
          await this.getCheckTokenBalanceRests(
            accounts, this.config.getTokenName(), 
            newBalances
          ),
          [true, true],
          'check new token balance on rest'
        );
 
      })()
    ]);

  }

  checkTransferTransaction(accounts) {
    const initBalances = await this.getInitBalances(accounts);

    let tx;
    await Promise.all([
      (async () => {
        tx = await this.blockchain.sendTransferTransaction(
          accounts[0], accounts[1], 
          this.config.getTransferAmount()
        );
        await this.alerter.info('send transfer transaction ' + tx.getId());
      })(),
      (async () => {
        const contentTx = await this.getMessageTransaction();
        await this.alerter.expect(
          await this.blockchain.checkUnconfirmedTx(contentTx),
          'check unconfirmed transaction ' + tx.getId()
        );
      })(),
      (async () => {
        const contentTx = await getMessageTransaction();
        await this.alerter.expect(
          await this.blockchain.checkConfirmedTx(contentTx),
          'check confirmed transaction ' + tx.getId()
        );

        const newBalances = this.initNewBalances(initBalances, 
          blockchainConfig.getTransferAmount()
        );
        await this.alerter.expect(
          await this.getCheckBalanceMessages(accounts, newBalances),
          [true, true],
          'check message about update balance'
        );

        await this.alerter.expect(
          await this.getCheckBalanceRests(accounts, newBalances),
          [true, true],
          'check new balance on rest'
        );
 
      })()
    ]);

  }


}

module.exports = TxService;