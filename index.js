/* 
* Copyright 2017–2018, LaborX PTY
* Licensed under the AGPL Version 3 license.
* @author Kirill Sergeev <cloudkserg11@gmail.com>
*/


const config = require('./config'),
 Promise = require('bluebird'),
  _ = require('lodash'),
  TxService = require('./services/TxService'),
  blockchainFactory = require('./services/blockhainFactory'),
  Alerter = require('./services/Alerter');

const registerAccounts = async (blockchain, addresses) => {
  await Promise.mapSeries(addresses, async address => {
    await blockchain.registerAccount(address);
  });
};



const init = async () => {
  await Promise.mapSeries(config.blockchains, async (blockchainConfig) => {
    const blockchain = blockchainFactory(blockchainConfig);

    const alerter = new Alerter(config.slack.token, config.slack.conversation, 
      blockchainConfig.getSymbol());
    await alerter.init();

    const addresses = blockchainConfig.getAccounts();

    try {
      registerAccounts(blockchain, addresses);
      await alerter.info('register accounts');
  
      const txService = new TxService(blockchainConfig, blockchain, alerter);
      await txService.checkTransferTransaction(addresses);
      if (blockchainConfig.getTokenAccount()) 
        await txService.checkTokenTransaction([
          blockchainConfig.getTokenAccount(),
          addresses[1]
        ]);

    } catch (e) {
      await alerter.error(e);
    }
  });

};

module.exports = init();
