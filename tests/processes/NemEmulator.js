/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const Emulator = require('./Emulator');

class NemEmulator extends Emulator {
  balanceFromStageForTo (stage) {
    if (stage == 'register') 
    return {
      balance: {
        confirmed: {
          amount: 0
        }
      }
    };
    return {
      balance: {
        confirmed: {
          amount: this.config.amount
        }
      }
    };
  }
  
  balanceFromStageForFrom (stage) {
    if (stage == 'register') 
      return {
        balance: {
          confirmed: {
            amount: this.config.amount
          }
        }
      };
      return {
        balance: {
          confirmed: {
            amount: 0
          }
        }
      };
  }
  
  signTransaction () {
    return {
      signature: 'sdfsdfsdfsdf'
    };
  }
  
  sendTransaction () {
    return {
      meta: {
        hash: {
          data: 5677
        }
      }
    }
  }


  getBalanceMessageCount() {
    return 2;
  }

  createConfirmedTx() {
    return {
      hash: 5677,
      blockNumber: 10
    };
  }

  getSymbol() {
    return 'nem';
  }
}

module.exports = NemEmulator;