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
const BlockchainConfig = require('../services/BlockchainConfig'),
    _ = require('lodash');


const blockchainSymbols = [
  'WAVES',
  'NEM',
  'BITCOIN',
  'ETH'
];
const blockchains = _.chain(blockchainSymbols).map(symbol => {
  const symbolConfig = _.get(process.env, symbol, '');

  if (symbolConfig.length >= 6) {
    const parts = _.chain(symbolConfig).split(',').map(a => a.split('@')).fromPairs().value()
    const config = new BlockchainConfig(
      parts['from'], //addressFrom
      parts['to'], //addressTo
      parts['amount'], //amount
      parts['rabbitPrefix'], //serviceName
      parts['rabbitUrl'], //rabbitUri
      parts['restPort'] //restPort
    );
    config.setRestUrl(parts['restUrl']);

    config.setLaborxUrl(process.env.LABORX_URL);
    config.setSignature(process.env.LABORX_SIGNATURE);
    config.setLaborxRabbit(process.env.LABORX_RABBIT);

    config.setEthKey(process.env.ETH_PUBLIC_KEY);
    config.setSymbol(symbol);
    _.chain(parts)
        .omit(['from', 'to', 'amount', 'rabbitPrefix', 'rabbitUrl', 'restPort'])
        .toPairs().value()
        .forEach(p => config.setOther(p[0], p[1]));
    config.setSignUrl(process.env.SIGN_URL);
    return config;
  }
  return null;
}).filter(bl => bl !== null).value();

let config = {
  useAlerterMock: process.env.ALERTER_MOCK || false,
  slack: {
    token: process.env.SLACK_TOKEN || '',
    conversation: process.env.SLACK_CONVERSATION || ''
  },
  blockchains
};


module.exports = config;
