# middleware-check-bot [![Build Status](https://travis-ci.org/ChronoBank/middleware-check-bot.svg?branch=master)](https://travis-ci.org/ChronoBank/middleware-check-bot)

Middleware bot for checking tx send process of chronobank

after set all needed blockchains in .env, run node index.js
and get all messages in log and slack channel about checking process;

##### сonfigure your .env

To apply your configuration, create a .env file in root folder of repo (in case it's not present already).
Below is the expamle configuration:

```
WAVES=from@3JfE6tjeT7PnpuDQKxiVNLn4TJUFhuMaaT5,to@3Jk2fh8aMBmhCQCkBcUfKBSEEa3pDMkDjCr,amount@100,rabbitPrefix@app_waves,rabbitUrl@amqp://localhost:5672,restPort@8081,tokenName@BxmzJx5DDsM16kX9p5UcaR62YqkAmEywkhtNcEcAb8n6,tokenAmount@100,tokenFrom@3JfE6tjeT7PnpuDQKxiVNLn4TJUFhuMaaT5,restUrl@localhost
NEM=from@TAX7OUHMQSTDXOMYJIKHFILRKOLVYGECG47FPKGQ,to@TAHZD4PLMR4OX3OLNMJCC726PNLXCJMCFWR2JI3D,amount@1,rabbitPrefix@app_nem,rabbitUrl@amqp://localhost:5672,restPort@8081,tokenName@e5bf16d9ac831b194bb6ee143f3e94dacc59dbadf22835820a7424fd6c07591c,tokenAmount@100,tokenFrom@TA6ABBIURROLKGHCNPN5R4K2FOA5VWSEDHHUGJVU,network@-104,restUrl@localhost
ETH=from@294f3c4670a56441f3133835a5cbb8baaf010f88,to@a8ade2954733a91e2a421c8751e482d54b0006da,amount@100,rabbitPrefix@app_eth,rabbitUrl@amqp://localhost:5672,restPort@8081,restUrl@localhost
SIGN_URL=http://localhost:8082
LABORX_URL=http://localhost:3001/api/v1/security
ETH_PUBLIC_KEY=dcc8c6eb281e134d90d7f7b449c242e44147b8fcd4c483e0e8276950ea04e9f204b212ae8f472c60867feee40c5ecdc1f7e9d4342cce9dc639dec0282e28537e
SLACK_KEY=sdfsdfsdf
SLACK_CONVERSATION=C1232456
```

The options are presented below:

| name | description|
| ------ | ------ |
| WAVES | String of variables for waves node, split by comma in format [name@value]: from, to, amount, rabbitPrefix, rabbitUri, restPort, tokenName, tokenAmount, tokenFrom, restUrl
| NEM | String of variables for nem node, split by comma in format [name@value]: from, to, amount, rabbitPrefix, rabbitUri, restPort, tokenName, tokenAmount, tokenFrom, network[=-104 in mainnet], restUrl
| BITCOIN | String ofvariables for bitcoin node, split by comma in format [name@value]: from, to, amount, rabbitPrefix, rabbitUri, restPort, restUrl
| ETH | String of variables for eth node, split by comma in format [name@value]: from, to, amount, rabbitPrefix, rabbitUri, restPort, restUrl
| SIGN_URL | url for signing transaction
| LABORX_URL | url for laborx backend, where we registration address and remove
| ETH_PUBLIC_KEY | PUBLIC KEY for all addresses in laborx
| SLACK_TOKEN |  An access token (from your Slack app or custom integration - xoxp, xoxb, or xoxa)
| SLACK_CONVERSATION | This argument can be a channel ID, a DM ID, a MPDM ID, or a group ID

License
----
 [GNU AGPLv3](LICENSE)

Copyright
----
LaborX PTY
