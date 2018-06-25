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
const path = require('path'),
  requests = require('../services/nodeRequests'),
  mongoose = require('mongoose'),
  rest = {
    domain: process.env.DOMAIN || 'localhost',
    port: parseInt(process.env.REST_PORT) || 8081,
    auth: process.env.USE_AUTH || false
  }, 
  rabbit = {
    url: process.env.RABBIT_URI || 'amqp://localhost:5672',
    serviceName: process.env.RABBIT_SERVICE_NAME || 'app_waves'
  },
  node = {
    rpc: process.env.RPC || 'http://localhost:6869'
  };

let config = {
  rabbit,
  mongo: {
    accounts: {
      uri: process.env.MONGO_ACCOUNTS_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/data',
      collectionPrefix: process.env.MONGO_ACCOUNTS_COLLECTION_PREFIX || process.env.MONGO_COLLECTION_PREFIX || 'waves'
    },
    data: {
      uri: process.env.MONGO_DATA_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/data',
      collectionPrefix: process.env.MONGO_DATA_COLLECTION_PREFIX || process.env.MONGO_COLLECTION_PREFIX || 'waves',
      useData: process.env.USE_MONGO_DATA ? parseInt(process.env.USE_MONGO_DATA) : 1
    }
  },
  node,
  rest,
  nodered: {
    mongo: {
      uri: process.env.NODERED_MONGO_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/data',
      collectionPrefix: process.env.NODE_RED_MONGO_COLLECTION_PREFIX || ''
    },
    autoSyncMigrations: process.env.NODERED_AUTO_SYNC_MIGRATIONS || true,
    customNodesDir: [path.join(__dirname, '../')],
    migrationsDir: path.join(__dirname, '../migrations'),
    migrationsInOneFile: true,
    httpAdminRoot: process.env.HTTP_ADMIN || false,
    functionGlobalContext: {
      connections: {
        primary: mongoose
      },
      libs: {
          requests,
      },

      settings: {
        node,
        apiKey: process.env.API_KEY || 'password',
        mongo: {
          accountPrefix: process.env.MONGO_ACCOUNTS_COLLECTION_PREFIX || process.env.MONGO_COLLECTION_PREFIX || 'waves',
          collectionPrefix: process.env.MONGO_DATA_COLLECTION_PREFIX || process.env.MONGO_COLLECTION_PREFIX || 'waves'
        },
        rabbit
      }
    }
  }
};


module.exports = config;
