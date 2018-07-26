/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
require('dotenv/config');

const  spawn = require('child_process').spawn,
  amqp = require('amqplib');


let conn;

describe('core/rest', function () {

  before(async () => {
    conn = await amqp.connect('amqp://localhost:5672');
  });

  after(async () => {
    await conn.close();
  });

  it('run check for waves node', async () => {
    const env = {
      SYMBOL: 'WAVES',
      ALERTER_MOCK: true,
      WAVES: 'from@3JfE6tjeT7PnpuDQKxiVNLn4TJUFhuMaaT5,to@3Jk2fh8aMBmhCQCkBcUfKBSEEa3pDMkDjCr,amount@100,rabbitPrefix@app_waves,rabbitUrl@amqp://localhost:5672,restPort@8081,tokenName@BxmzJx5DDsM16kX9p5UcaR62YqkAmEywkhtNcEcAb8n6,tokenAmount@100,tokenFrom@3JfE6tjeT7PnpuDQKxiVNLn4TJUFhuMaaT5,restUrl@localhost',
      SIGN_URL: 'http://localhost:8081',
      LABORX_URL: 'http://localhost:8081/api/v1/security',
      LABORX_RABBIT: 'amqp://localhost:5672',
      LABORX_SIGNATURE: 'Signature 0x3878e330b384e83f614a621c57efedd2eef98eef609db5a3d1f1f8da1e79829f42f141a853951ad065f928334194e38ea056c45b5a5ee195e9d3da290202593a1b',
      ETH_PUBLIC_KEY: 'dcc8c6eb281e134d90d7f7b449c242e44147b8fcd4c483e0e8276950ea04e9f204b212ae8f472c60867feee40c5ecdc1f7e9d4342cce9dc639dec0282e28537e',
      SLACK_KEY: 'sdfsdfsdf',
    };

    const emulatorPid = spawn('node', ['./tests/processes/runEmulator.js', 'emulator'], 
      {env, stdio: 'ignore'}
    );
    emulatorPid.on('error', c => {
      console.log('error emulator', c)
    });
    emulatorPid.on('close', (c, s) => {
      console.log('close emulator', c, s)
    });
    emulatorPid.on('exit', c => {
      console.log('exit emulator', c)
    });

    console.log('start' + emulatorPid.pid);

    let processPid;
    await Promise.all([
      (async () => {
        const channel = await conn.createChannel();
        await channel.assertExchange('test', 'fanout', {durable: false});
        await channel.assertQueue('test_alert', {autoDelete: true, durable: false});
        await channel.bindQueue('test_alert', 'test', `*`);
    
        const messages = [
          'SUCCESS! delete accounts',
          'SUCCESS! register accounts',
          'SUCCESS! start all timer for 300000',
          'SUCCESS! sign transaction sdfsdfsdfsdf',
          'SUCCESS! send transfer transaction 5677',
          'SUCCESS! get 2 rmq messages about confirmed transaction: 5677',
          'SUCCESS! start block timer for 2000',
          'SUCCESS! check rmq message about balance on sender with init=100 with new=0',
          'SUCCESS! check rmq message about balance on recipient with init=0 with new=100',
          'SUCCESS! check balance sender from rest with init=100 with new=0',
          'SUCCESS! check balance recipient from rest with init=0 with new=100'
        ];
        await new Promise(res  => {
          countMsgs = 0;
          channel.consume('test_alert', async (message) => {
            const content = JSON.parse(message.content);
            console.log(content.message);            
            if (messages.indexOf(content.message) != -1) 
              countMsgs++;
            if (countMsgs == messages.length) 
              res();
          }, {noAck: true});
        });
      })(),
      (async () => {
        processPid = spawn('node', ['index.js', 'check-bot'],
          {env, stdio: 'ignore'}
        );
        processPid.on('error', (c) => {
          console.log('bot error', c);
        });
        processPid.on('exit', (c) => {
          console.log('bot exit', c);
        });
        processPid.on('close', (c) => {
          console.log('bot close', c);
        });


        console.log('start process' + processPid.pid);

      })()
    ]);

    console.log('kill processes');
    processPid.kill();
    emulatorPid.kill();
  });

  // it('run check for nem node', async () => {
  //   const env = {
  //     SYMBOL: 'NEM',
  //     ALERTER_MOCK: true,
  //     NEM: 'from@TAX7OUHMQSTDXOMYJIKHFILRKOLVYGECG47FPKGQ,to@TAHZD4PLMR4OX3OLNMJCC726PNLXCJMCFWR2JI3D,amount@1,rabbitPrefix@app_nem,rabbitUrl@amqp://localhost:5672,restPort@8081,tokenName@e5bf16d9ac831b194bb6ee143f3e94dacc59dbadf22835820a7424fd6c07591c,tokenAmount@100,tokenFrom@TA6ABBIURROLKGHCNPN5R4K2FOA5VWSEDHHUGJVU,network@-104,restUrl@localhost',
  //     SIGN_URL: 'http://localhost:8081',
  //     LABORX_URL: 'http://localhost:8081/api/v1/security',
  //     LABORX_RABBIT: 'amqp://localhost:5672',
  //     LABORX_SIGNATURE: 'Signature 0x3878e330b384e83f614a621c57efedd2eef98eef609db5a3d1f1f8da1e79829f42f141a853951ad065f928334194e38ea056c45b5a5ee195e9d3da290202593a1b',
  //     ETH_PUBLIC_KEY: 'dcc8c6eb281e134d90d7f7b449c242e44147b8fcd4c483e0e8276950ea04e9f204b212ae8f472c60867feee40c5ecdc1f7e9d4342cce9dc639dec0282e28537e',
  //     SLACK_KEY: 'sdfsdfsdf',
  //   };

  //   const emulatorPid = spawn('node', ['./tests/processes/runEmulator.js', 'emulator'], 
  //     {env, stdio: 'ignore'}
  //   );
  //   emulatorPid.on('error', c => {
  //     console.log('error emulator', c)
  //   });
  //   emulatorPid.on('close', (c, s) => {
  //     console.log('close emulator', c, s)
  //   });
  //   emulatorPid.on('exit', c => {
  //     console.log('exit emulator', c)
  //   });

  //   console.log('start' + emulatorPid.pid);

  //   let processPid;
  //   await Promise.all([
  //     (async () => {
  //       const channel = await conn.createChannel();
  //       await channel.assertExchange('test', 'fanout', {durable: false});
  //       await channel.assertQueue('test_alert', {autoDelete: true, durable: false});
  //       await channel.bindQueue('test_alert', 'test', `*`);
    
  //       const messages = [
  //         'SUCCESS! delete accounts',
  //         'SUCCESS! register accounts',
  //         'SUCCESS! start all timer for 300000',
  //         'SUCCESS! sign transaction sdfsdfsdfsdf',
  //         'SUCCESS! send transfer transaction 5677',
  //         'SUCCESS! get 2 rmq messages about confirmed transaction: 5677',
  //         'SUCCESS! start block timer for 2000',
  //         'SUCCESS! check rmq message about balance on sender with init=100 with new=0',
  //         'SUCCESS! check rmq message about balance on recipient with init=0 with new=100',
  //         'SUCCESS! check balance sender from rest with init=100 with new=0',
  //         'SUCCESS! check balance recipient from rest with init=0 with new=100'
  //       ];
  //       await new Promise(res  => {
  //         countMsgs = 0;
  //         channel.consume('test_alert', async (message) => {
  //           const content = JSON.parse(message.content);
  //           console.log(content.message);            
  //           if (messages.indexOf(content.message) != -1) 
  //             countMsgs++;
  //           if (countMsgs == messages.length) 
  //             res();
  //         }, {noAck: true});
  //       });
  //     })(),
  //     (async () => {
  //       processPid = spawn('node', ['index.js', 'check-bot'],
  //         {env, stdio: 'ignore'}
  //       );
  //       processPid.on('error', (c) => {
  //         console.log('bot error', c);
  //       });
  //       processPid.on('exit', (c) => {
  //         console.log('bot exit', c);
  //       });
  //       processPid.on('close', (c) => {
  //         console.log('bot close', c);
  //       });


  //       console.log('start process' + processPid.pid);

  //     })()
  //   ]);

  //   console.log('kill processes');
  //   processPid.kill();
  //   emulatorPid.kill();
  // });


});
