const WavesAPI = require('@waves/waves-api'),
request = require('request-promise');


const main = async () => {
    const Waves = WavesAPI.create({
        networkByte: 'TESTNET',
        nodeAddress: 'bla-bla-bla',
        matcherAddress: 'bla-bla',
        minimumSeedLength: 1
      });
      const seed = Waves.Seed.fromExistingPhrase('advice shed boat scan game expire reveal rapid concert settle before vital');
      const transferData = {
        senderPublicKey: seed.keyPair.publicKey,
        // An arbitrary address; mine, in this example
        recipient: '3MuQHu64HwboRdxzh9rpPDuUJDR9UEHH7zE',
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
      console.log(Waves);
      const Transactions = Waves.Transactions;
      const transferTransaction = new Transactions.TransferTransaction(transferData);
      const tx  = await transferTransaction.prepareForAPI(seed.keyPair.privateKey);
      console.log(tx);

      const newTx = await request({
        method: 'POST',
        'json': true,
        body: {tx},
        uri: 'https://middleware-waves-testnet-rest.chronobank.io/tx/send'
      });
      console.log(newTx);
};

main();


