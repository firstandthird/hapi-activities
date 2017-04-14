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

    // register the 'hook' method with the server:
    if (options.decorate) {
      server.decorate('server', 'hook', (hookName, hookData) => {
        hook(server, settings, collection, hookName, hookData);
      });
    } else {
      server.method('hook', (hookName, hookData) => {
        hook(server, settings, collection, hookName, hookData);
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
