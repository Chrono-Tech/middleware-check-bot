# middleware-check-bot [![Build Status](https://travis-ci.org/ChronoBank/middleware-check-bot.svg?branch=master)](https://travis-ci.org/ChronoBank/middleware-check-bot)

Middleware bot for checking tx send process of chronobank

after set all needed blockchains in .env, run node index.js
and get all messages in log and slack channel about checking process;


##### сonfigure your .env

To apply your configuration, create a .env file in root folder of repo (in case it's not present already).
Below is the expamle configuration:

```
WAVES=3JfE6tjeT7PnpuDQKxiVNLn4TJUFhuMaaT5,3Jk2fh8aMBmhCQCkBcUfKBSEEa3pDMkDjCr,100,app_waves,amqp://localhost:5672,8081
SIGN_URL=http://localhost:8081
SLACK_TOKEN=sdfsdfs
SLACK_CONVERSATION=C1232456
```

The options are presented below:

| name | description|
| ------ | ------ |
| WAVES | String of 6 variables for blockhain waves, split by comma: addrFrom, addrTo, amount, serviceName, rabbitUri, restPort
| NEM | String of 6 variables for nem waves, split by comma: addrFrom, addrTo, amount, serviceName, rabbitUri, restPort
| BITCOIN | String of 6 variables for bitcoin waves, split by comma: addrFrom, addrTo, amount, serviceName, rabbitUri, restPort
| ETH | String of 6 variables for eth waves, split by comma: addrFrom, addrTo, amount, serviceName, rabbitUri, restPort
| SIGN_URL | url for signing transaction
| SLACK_TOKEN |  An access token (from your Slack app or custom integration - xoxp, xoxb, or xoxa)
| SLACK_CONVERSATION | This argument can be a channel ID, a DM ID, a MPDM ID, or a group ID

License
----
 [GNU AGPLv3](LICENSE)

Copyright
----
LaborX PTY
