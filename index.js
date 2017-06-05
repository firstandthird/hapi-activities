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
  log: false
};

exports.register = (server, options, next) => {
  const settings = Object.assign({}, defaults, options);
  // connect to db:
  mongo.connect(settings.mongo.host, (connErr, db) => {
    if (connErr) {
      return next(connErr);
    }
    // initialize the server object:
    const collection = db.collection(settings.mongo.collectionName);

    // update all hooks:
    const updateHooks = require('./lib/updateHooks.js');

    const hook = require('./lib/hook.js');
    const retry = (collection, hookId) => {
      collection.find({ _id: hookId }).toArray((err, result) => {
        console.log(err);
        console.log(result);
      });
    };

    // register the 'hook' method with the server:
    if (options.decorate) {
      server.decorate('server', 'hook', (hookName, hookData, hookOptions) => {
        hook(server, settings, collection, hookName, hookData, hookOptions || {});
      });
      server.decorate('server', 'retry', (hookId) => {
        retry(server, settings, collection, hookId, hookOptions || {});
      });
    } else {
      server.method('hook', (hookName, hookData, hookOptions) => {
        hook(server, settings, collection, hookName, hookData, hookOptions || {});
      });
      server.method('retry', (hookId) => {
        retry(collection, hookId);
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
      updateHooks(server, settings, collection, (err) => {
        if (err) {
          server.log(['hapi-hooks', 'error'], err);
        }
        if (continueProcessing) {
          setTimeout(timer, settings.interval);
        }
      });
    };
    timer();
    // now tell hapi that we're done registering the plugin!
    next();
  });
};

exports.register.attributes = {
  pkg: require('./package.json')
};
