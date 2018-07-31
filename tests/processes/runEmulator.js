/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
require('dotenv').config();
const WavesEmulator = require('./WavesEmulator'),
  NemEmulator = require('./NemEmulator'),
  EthEmulator = require('./EthEmulator'),
  BtcEmulator = require('./BtcEmulator');

const init = async () => {

  let emul;
  switch(process.env.SYMBOL) {
    case 'WAVES':
      emul = new WavesEmulator(process.env, process.env.SYMBOL);
      break;
    case 'NEM':
      emul = new NemEmulator(process.env, process.env.SYMBOL);
      break;
    case 'ETH':
      emul = new EthEmulator(process.env, process.env.SYMBOL);
      break; 
    case 'BITCOIN':
      emul = new BtcEmulator(process.env, process.env.SYMBOL);
      break; 
  }
  await emul.start();
}

module.exports = init();
