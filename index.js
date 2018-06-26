/* 
* Copyright 2017–2018, LaborX PTY
* Licensed under the AGPL Version 3 license.
* @author Kirill Sergeev <cloudkserg11@gmail.com>
*/


const config = require('./config'),
 Promise = require('bluebird'),
 mongoose = require('mongoose');

mongoose.Promise = Promise; // Use custom Promises
mongoose.connect(config.mongo.data.uri, {useMongoClient: true});
mongoose.accounts = mongoose.createConnection(config.mongo.accounts.uri);

const _ = require('lodash'),
  bunyan = require('bunyan'),
  amqp = require('amqplib'),
  log = bunyan.createLogger({name: 'check-bot'}),
  blockchainFactory = require('./services/blochainFactory'),
  Alerter = require('./services/Alerter');


let amqpInstance;

[mongoose.accounts, mongoose.connection].forEach(connection =>
  connection.on('disconnected', function () {
    log.error('mongo disconnected!');
    process.exit(0);
  })
);

const registerAccounts = async (blockchain, accounts) => {
  await Promise.mapSeries(accounts, async account => {
    await blockchain.registerAccount(account);
  });
};

const getInitBalances = async (blockchain, accounts) => {
  return await Promise.mapSeries(accounts, async account => 
    await blockchain.getBalance(account)
  );
};

const getOneMessageAboutTransaction = async (callback) => {
  const channel = await amqpInstance.createChannel();
  await channel.assertExchange('internal', 'topic', {durable: false});
  await channel.assertQueue(`${config.rabbit.serviceName}_test.block`);
  await channel.bindQueue(`${config.rabbit.serviceName}_test.block`, 'internal', 
    `${config.rabbit.serviceName}_transaction.*`
  );
  await new Promise(res => channel.consume(`${config.rabbit.serviceName}_test.block`, async (message) => {
    const content = JSON.parse(message.content);
    await callback(content);
    await channel.cancel(message.fields.consumerTag);
  }, {noAck: true}));
};

const getConfirmedMessage = (account, balance) => 
'check changed balance after confirmed ' + account.address + 
' balance ' + balance;

const init = async () => {
  amqpInstance = await amqp.connect(config.rabbit.url)
    .catch(() => {
      log.error('rabbitmq process has finished!');
      process.exit(0);
    });

  const blockchains = blockchainFactory.create(config.blockchains);

  await Promise.mapSeries(blockchains, blockchain => {
    const alerter = new Alerter(blockchain);
    await alerter.init();

    const accounts = blockchain.getAccounts();
    registerAccounts(blockchain, accounts);
    alerter.info('register accounts');

    const initBalances = getInitBalances(blockchain, accounts);
    alerter.info('get init balances for accounts');    

    let tx;
    await Promise.all([
      (async () => {
        tx = blockchain.sendTransferTransaction(
          accounts[0], accounts[1], 
          blockchain.getTransferAmount()
        );
        alerter.info('send transfer transaction ' + tx.id);
      })(),
      (async () => {
        
        await getOneMessageAboutTransaction(async content => {
          await blockchain.checkUnconfirmedTx(tx, content);
        });
        alerter.info('check unconfirmed transaction ' + tx.id);
        
        alerter.expect(
          await blockchain.getBalance(accounts[0]), 
          initBalances[0],
          'check not changed balances after unconfirmed ' + tx.id
        );
        alerter.expect(
          await blockchain.getBalance(accounts[1]), 
          initBalances[1],
          'check not changed balances after unconfirmed ' + tx.id
        );
      })(),
      (async () => {
        await getOneMessageAboutTransaction(async content => {
          await blockchain.checkConfirmedTx(tx, content);
        });
        alerter.info('check confirmed transaction ' + tx.id);

        alerter.expect(
          await blockchain.getBalance(accounts[0]), 
          initBalances[0]-blockchain.getTransferAmount(),
          getConfirmedMessage(accounts[0], initBalances[0]-blockchain.getTransferAmount())
        );
        alerter.expect(
          await blockchain.getBalance(accounts[0]), 
          initBalances[0]+blockchain.getTransferAmount(),
          getConfirmedMessage(accounts[1], initBalances[1]+blockchain.getTransferAmount())
        );
      })()
    ]);
  });

};

module.exports = init();