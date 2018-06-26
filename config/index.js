/**
 * Chronobank/waves-rest configuration
 * @module config
 * @returns {Object} Configuration
 * 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
*/
require('dotenv').config();
const BlockchainConfig = require('../services/BlockchainConfig');


const blockchainSymbols = [
  'WAVES',
  'NEM',
  'BITCOIN',
  'ETH'
];
const blockchains = _.chain(blockchainSymbols).map(symbol => {
  const parts = _.get(process.env, symbol, '').split(',');
  if (parts.length == 8) {
    const config = new BlockchainConfig(
      parts[0], //addressFrom
      parts[1], //addressTo
      parts[2], //amount
      parts[3], //serviceName
      parts[4], //rabbitUri
      parts[5] //restPort
    );
    config.setSymbol(symbol);
    config.setSignUrl(process.env.SIGN_URL);
    return config;
  }
  return null;
}).filter(bl => bl !== null).value();

let config = {
  slack: {
    token: process.env.SLACK_TOKEN || '',
    conversation: process.env.SLACK_CONVERSATION || ''
  },
  blockchains
};


module.exports = config;
