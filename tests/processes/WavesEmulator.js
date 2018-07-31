/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const Emulator = require('./Emulator');

class WavesEmulator extends Emulator {
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
    this.id = this.genNumber()
    return {
      id: this.id
    }
  }


  getBalanceMessageCount() {
    return 2;
  }

  createUnconfirmedTx() {
    return {
      id: this.id,
      blockNumber: -1
    };
  }

  createConfirmedTx() {
    return {
      id: this.id,
      blockNumber: 10
    };
  }

  getSymbol() {
    return 'waves';
  }
}

module.exports = WavesEmulator;