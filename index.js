/* eslint-disable no-underscore-dangle */
'use strict';
const mongo = require('mongodb');
const defaults = {
  mongo: {
    host: 'mongodb://localhost:27017',
    collectionName: 'hapi-hooks'
  },
  timeout: 30 * 1000, // max time an action can take, default is 30 secs, set to false for infinity
  interval: 5 * 60 * 1000, // 5 minutes
  log: false,
  batchSize: 0,
  concurrent: 10,
  maxRetries: 3
};

exports.register = (server, options, next) => {
  const settings = Object.assign({}, defaults, options);
  // register hapi-hooks events with server:
  server.event('hook:query');
  server.event('hook:start'); // passes the hook data to the event handler
  server.event('hook:complete'); // passes the hook data and result data to the event handler
  // connect to db:
  mongo.connect(settings.mongo.host, (connErr, db) => {
    if (connErr) {
      return next(connErr);
    }
    // initialize the server object:
    const collection = db.collection(settings.mongo.collectionName);
    collection.createIndex({ status: 1 }, { background: true }, (indexErr, result) => {
      if (indexErr) {
        throw indexErr;
      }
    });
    // update all hooks:
    const queryHooks = require('./lib/queryHooks.js');
    const hook = require('./lib/hook.js');
    const retry = require('./lib/retry.js');

    // register the 'hook' method with the server:
    if (options.decorate) {
      server.decorate('server', 'hook', (hookName, hookData, hookOptions) => {
        hook(server, settings, collection, hookName, hookData, hookOptions || {});
      });
      server.decorate('server', 'retryHook', (hookId, callback) => {
        retry(server, settings, collection, hookId, (err, response) => {
          if (err) {
            return callback(err);
          }
          callback(err, response.performActions);
        });
      });
    } else {
      server.method('hook', (hookName, hookData, hookOptions) => {
        hook(server, settings, collection, hookName, hookData, hookOptions || {});
      });
      server.method('retryHook', (hookId, callback) => {
        retry(server, settings, collection, hookId, (err, response) => {
          if (err) {
            return callback(err);
          }
          callback(err, response.performActions);
        });
      });
    }

    // keep processing hooks until the server.stop method is called
    let continueProcessing = true;
    server.ext({
      type: 'onPreStop',
      method: (request, done) => {
        continueProcessing = false;
        done();
      }
    });
    const timer = () => {
      if (!continueProcessing) {
        return;
      }
      queryHooks(server, settings, collection, (err) => {
        if (err) {
          server.log(['hapi-hooks', 'error'], err);
        }
      });
      if (continueProcessing) {
        setTimeout(timer, settings.interval);
      }
    };
    timer();
    // now tell hapi that we're done registering the plugin!
    next();
  });
};

exports.register.attributes = {
  pkg: require('./package.json')
};
