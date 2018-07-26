/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const Emulator = require('./Emulator');

class EthEmulator extends Emulator {
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
}

module.exports = EthEmulator;