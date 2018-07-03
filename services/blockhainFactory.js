/** 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
*/
const symbolClasses = {
  'WAVES': require('../blockchain/wavesChain'),
  'NEM': require('../blockchain/nemChain'),
  'ETH': require('../blockchain/ethChain'),
  'BITCOIN': require('../blockchain/bitcoinChain'),
};
module.exports = (blockchainConfig) => {
  if (!symbolClasses[blockchainConfig.getSymbol()]) 
    throw new Error('not found symbol in blockchains');
  
  const template = symbolClasses[blockchainConfig.getSymbol()];
  return new template(blockchainConfig);
};
