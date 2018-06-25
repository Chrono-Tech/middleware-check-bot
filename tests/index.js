/** 
* Copyright 2017–2018, LaborX PTY
* Licensed under the AGPL Version 3 license.
* @author Kirill Sergeev <cloudkserg11@gmail.com>
*/
require('dotenv/config');

process.env.USE_MONGO_DATA = 1;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const config = require('./config'),
  mongoose = require('mongoose'),
  Promise = require('bluebird'),
  expect = require('chai').expect,
  _ = require('lodash');


mongoose.Promise = Promise;
mongoose.accounts = mongoose.createConnection(config.mongo.accounts.uri);
mongoose.data = mongoose.createConnection(config.mongo.data.uri);

const accountModel = require('../models/accountModel'),
  txModel = require('./models/txModel'),
  clearQueues = require('./helpers/clearQueues'),
  connectToQueue = require('./helpers/connectToQueue'),
  WavesAPI = require('@waves/waves-api'),
  consumeMessages = require('./helpers/consumeMessages'),
  saveAccountForAddress = require('./helpers/saveAccountForAddress'),
  getAccountFromMongo = require('./helpers/getAccountFromMongo'),
  signPrivateTransaction = require('./services/signPrivateTransaction'),
  request = require('request'),
  amqp = require('amqplib');

let accounts, amqpInstance;

describe('core/rest', function () { //todo add integration tests for query, push tx, history and erc20tokens

  before(async () => {
    await txModel.remove();
    await accountModel.remove();    
    
    amqpInstance = await amqp.connect(config.rabbit.url);

    accounts = config.dev.accounts;
    await saveAccountForAddress(accounts[0]);
    await clearQueues(amqpInstance);
  });

  after(async () => {
    return mongoose.disconnect();
  });

  afterEach(async () => {
    await clearQueues(amqpInstance);
  });

  it('address/create from post request and check send event user.created in internal', async () => {
    const newAddress = `${_.chain(new Array(35)).map(() => _.random(0, 9)).join('').value()}`;
    accounts.push(newAddress);

    await new Promise.all([
      (async() => {
        await new Promise((res, rej) => {
          request({
            url: `http://localhost:${config.rest.port}/addr/`,
            method: 'POST',
            json: {address: newAddress}
          }, async (err, resp) => {
            if (err || resp.statusCode !== 200) 
              return rej(err || resp);
            const account = await getAccountFromMongo(newAddress);
            expect(account).not.to.be.null;
            expect(account.isActive).to.be.true;
            res();
          });
        });
      })(),
      (async () => {
        const channel = await amqpInstance.createChannel();
        await channel.assertExchange('internal', 'topic', {durable: false});
        const balanceQueue = await channel.assertQueue(`${config.rabbit.serviceName}_test.user`);
        await channel.bindQueue(`${config.rabbit.serviceName}_test.user`, 'internal', 
          `${config.rabbit.serviceName}_user.created`
        );
        channel.consume(`${config.rabbit.serviceName}_test.user`, async (message) => {
          const content = JSON.parse(message.content);
          expect(content.address).to.be.equal(newAddress);
        }, {noAck: true});
      })()
    ]);

  });

  it('tx/send send signedTransaction', async () => {
    const Waves = WavesAPI.create({
      networkByte: 'CUSTOM',
      nodeAddress: config.node.rpc,
      matcherAddress: config.dev.matcherAddress,
      minimumSeedLength: 1
    });
    const seed = Waves.Seed.fromExistingPhrase(config.dev.seedPhraseOne);
    const transferData = {
      senderPublicKey: seed.keyPair.publicKey,
      // An arbitrary address; mine, in this example
      recipient: '3Jk2fh8aMBmhCQCkBcUfKBSEEa3pDMkDjCr',
      // ID of a token, or WAVES
      assetId: 'WAVES',
      // The real amount is the given number divided by 10^(precision of the token)
      amount: 10000000,
      // The same rules for these two fields
      feeAssetId: 'WAVES',
      fee: 100000,
      // 140 bytes of data (it's allowed to use Uint8Array here)
      attachment: '',
      timestamp: Date.now()
    };
    const Transactions = Waves.Transactions;
    const transferTransaction = new Transactions.TransferTransaction(transferData);
    const tx  = await transferTransaction.prepareForAPI(seed.keyPair.privateKey);

    await new Promise((res, rej) => {
      request({
        url: `http://localhost:${config.rest.port}/tx/send`,
        method: 'POST',
        json: tx
      }, async (err, resp) => {
        if (err || resp.statusCode !== 200)
          return rej(err || resp);
        
        const body = resp.body;
        expect(body.senderPublicKey).to.eq(seed.keyPair.publicKey);
        expect(body.fee).to.eq(100000);
        expect(body.id).to.not.empty;
        res();
      });
    });
  });

  // it('address/create from rabbit mq', async () => {
  //   const newAddress = `${_.chain(new Array(35)).map(() => _.random(0, 9)).join('').value()}`;
  //   accounts.push(newAddress);    

  //   await Promise.all([
  //     (async () => {
  //       const channel = await amqpInstance.createChannel();
  //       const info = {address: newAddress};
  //       await channel.publish('events', `${config.rabbit.serviceName}.account.create`, new Buffer(JSON.stringify(info)));
    
  //       await Promise.delay(3000);
    
  //       const account = await getAccountFromMongo(newAddress);
  //       expect(account).not.to.be.null;
  //       expect(account.isActive).to.be.true;
  //       expect(account.balance.toNumber()).to.be.equal(0);
  //     })(),
  //     (async () => {
  //       const channel = await amqpInstance.createChannel();
  //       await connectToQueue(channel, `${config.rabbit.serviceName}.account.created`);
  //       await consumeMessages(1, channel, (message) => {
  //         const content = JSON.parse(message.content);
  //         expect(content.address).to.be.equal(newAddress);
  //       });
  //     })()
  //   ]);
  // });

  // it('address/update balance address by amqp', async () => {
  //   const channel = await amqpInstance.createChannel();
  //   const info = {address: accounts[0]};
  //   await channel.publish('events', `${config.rabbit.serviceName}.account.balance`, new Buffer(JSON.stringify(info)));

  //   await Promise.delay(3000);

  //   const account = await getAccountFromMongo(accounts[0]);
  //   expect(account).not.to.be.null;
  //   expect(account.balance.toNumber()).to.be.greaterThan(0);
  // });

  it('address/remove by rest', async () => {
    const removeAddress = _.pullAt(accounts, accounts.length-1)[0];

    await new Promise((res, rej) => {
      request({
        url: `http://localhost:${config.rest.port}/addr/`,
        method: 'DELETE',
        json: {address: removeAddress}
      }, async (err, resp) => {
        if (err || resp.statusCode !== 200)
          return rej(err || resp);
        
        const account = await getAccountFromMongo(removeAddress);
        expect(account).not.to.be.null;
        expect(account.isActive).to.be.false;
        res();
      });
    });
  });

  // it('address/remove from rabbit mq', async () => {
  //   const removeAddress = _.pullAt(accounts, accounts.length-1)[0];    

  //   await Promise.all([
  //     (async () => {
  //       const channel = await amqpInstance.createChannel();
  //       const info = {address: removeAddress};
  //       await channel.publish('events', `${config.rabbit.serviceName}.account.delete`, new Buffer(JSON.stringify(info)));
    
  //       await Promise.delay(3000);
    
  //       const account = await getAccountFromMongo(removeAddress);
  //       expect(account).not.to.be.null;
  //       expect(account.isActive).to.be.false;
  //     })(),
  //     (async () => {
  //       const channel = await amqpInstance.createChannel();
  //       await connectToQueue(channel, `${config.rabbit.serviceName}.account.deleted`);
  //       return await consumeMessages(1, channel, (message) => {
  //         const content = JSON.parse(message.content);
  //         expect(content.address).to.be.equal(removeAddress);
  //       });
  //     })()
  //   ]);
  // });

  const tokenForAsset = `${_.chain(new Array(35)).map(() => _.random(0, 9)).join('').value()}`;
  

  it('address/add asset by rest for right', async () => {
    const address = accounts[0];

    await new Promise((res, rej) => {
      request({
        url: `http://localhost:${config.rest.port}/addr/${address}/token`,
        method: 'POST',
        json: {assets: [tokenForAsset]}
      }, async (err, resp) => {
        if (err || resp.statusCode !== 200)
          return rej(err || resp);
        const account = await getAccountFromMongo(address);
        expect(account.assets[tokenForAsset]).to.be.equal(0);
        res();
      });
    });
  });



  it('address/add asset by rest for error', async () => {
    const address = accounts[1];
    const token = `0x${_.chain(new Array(40)).map(() => _.random(0, 9)).join('').value()}`;

    await new Promise((res, rej) => {
      request({
        url: `http://localhost:${config.rest.port}/addr/${address}/token`,
        method: 'POST',
        json: {assets: token}
      }, async (err, resp) => {
        if (err || resp.statusCode !== 200) 
          return rej(err || resp);
        expect(resp.body.code).to.be.equal(0);
        expect(resp.body.message).to.be.equal('fail');
        res();
      });
    });
  });

  it('address/remove asset by rest for right', async () => {
    const address = accounts[0];

    await new Promise((res, rej) => {
      request({
        url: `http://localhost:${config.rest.port}/addr/${address}/token`,
        method: 'DELETE',
        json: {assets: [tokenForAsset]}
      }, async (err, resp) => {
        if (err || resp.statusCode !== 200) 
          return rej(err || resp);
        const account = await getAccountFromMongo(address);
        expect(account.assets[tokenForAsset]).to.be.undefined;
        res();
      });
    });
  });

  it('address/remove asset by rest for error', async () => {
    const address = accounts[1];
    const token = `${_.chain(new Array(35)).map(() => _.random(0, 9)).join('').value()}`;

    await new Promise((res, rej) => {
      request({
        url: `http://localhost:${config.rest.port}/addr/${address}/token`,
        method: 'DELETE',
        json: {assets: token}
      }, async (err, resp) => {
        if (err || resp.statusCode !== 200) 
          return rej(err || resp);
        
        expect(resp.body.code).to.be.equal(0);
        expect(resp.body.message).to.be.equal('fail');
        res();
      });
    });
  });

  it('address/balance by rest', async () => {
    const address = accounts[0];

    await new Promise((res, rej) => {
      request({
        url: `http://localhost:${config.rest.port}/addr/${address}/balance`,
        method: 'GET',
      }, async (err, resp) => {
        if (err || resp.statusCode !== 200) 
          return rej(err || resp);

        const body = JSON.parse(resp.body);
        expect(body.balance).to.be.not.undefined;
        expect(body.assets).to.be.empty;
        res();
      });
    });
  });

  let exampleTransactionHash;

  it('GET tx/:addr/history for some query params and one right transaction [0 => 1]', async () => {
    const txs = [{
      'recipient' : accounts[1],
      'type' : '257',
      'sender' : accounts[0],
      'hash' : `${_.chain(new Array(40)).map(() => _.random(0, 9)).join('').value()}`,
      amount: 200,
      timeStamp: Date.now(),
      'blockNumber' : 1425994
    }, {
      'recipient' : 'TDFSDFSFSDFSDFSDFSDFSDFSDFSDFSDFS',
      'type' : '257',
      timeStamp: Date.now(),
      'sender' : 'FDGDGDFGDFGDFGDFGDFGDFGDFGDFGD',
      'hash' : `${_.chain(new Array(40)).map(() => _.random(0, 9)).join('').value()}`,
      amount: 100,
      'blockNumber' : 1425994
    }];
    
    exampleTransactionHash = txs[0].hash;
    await new txModel(txs[0]).save();
    await new txModel(txs[1]).save();

    const query = 'limit=1';

    await new Promise((res, rej) => {
      request({
        url: `http://localhost:${config.rest.port}/tx/${accounts[0]}/history?${query}`,
        method: 'GET',
      }, async (err, resp) => {
        if (err || resp.statusCode !== 200) 
          return rej(err || resp);

        try {
          expect(resp.body).to.not.be.empty;
          const body = JSON.parse(resp.body);
          expect(body).to.be.an('array').not.empty;

          const respTx = body[0];
          expect(respTx.recipient).to.equal(accounts[1]);
          expect(respTx.sender).to.equal(accounts[0]);
          expect(respTx.hash).to.equal(exampleTransactionHash);
          expect(respTx).to.contain.all.keys([
            'hash', 'blockNumber', 'timestamp', 'amount']
          );
          res();            
        } catch (e) {
          rej(e || resp);
        }
      });
    });
  });


  it('GET tx/:addr/history for non exist', async () => {
    const address = 'LAAAAAAAAAAAAAAAALLL';



    await new Promise((res, rej) => {
      request({
        url: `http://localhost:${config.rest.port}/tx/${address}/history`,
        method: 'GET',
      }, async (err, resp) => {
        if (err || resp.statusCode !== 200) 
          return rej(err || resp);

        const body = JSON.parse(resp.body);
        expect(body).to.be.empty;
        res();
      });
    });
  });

  it('GET tx/:hash for transaction [0 => 1]', async () => {
    await new Promise((res, rej) => {
      request({
        url: `http://localhost:${config.rest.port}/tx/${exampleTransactionHash}`,
        method: 'GET',
      }, (err, resp) => {
        if (err || resp.statusCode !== 200) 
          return rej(err || resp);

        const respTx = JSON.parse(resp.body);
        expect(respTx.recipient).to.equal(accounts[1]);
        expect(respTx.sender).to.equal(accounts[0]);
        expect(respTx).to.contain.all.keys([
          'sender', 'recipient', 'hash', 'blockNumber', 'amount', 'timestamp'
        ]);
        res();
      });
    });
  });
});
