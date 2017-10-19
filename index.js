/* eslint-disable no-underscore-dangle */
const mongo = require('mongodb');
const async = require('async');
const queryHooks = require('./lib/queryHooks.js');
const hook = require('./lib/hook.js');
const retry = require('./lib/retry.js');

const defaults = {
  mongo: {
    host: 'mongodb://localhost:27017',
    collectionName: 'hapi-hooks'
  },
  timezone: 'America/Los_Angeles',
  timeout: 30 * 1000, // max time an action can take, default is 30 secs, set to false for infinity
  interval: 5 * 60 * 1000, // 5 minutes
  log: false,
  batchSize: 0,
  concurrent: 10,
  maxRetries: 3,
  recurring: {},
  decorate: false
};

exports.register = (server, options, next) => {
  server.event('hook:query'); // passes the outstanding hooks that were found
  server.event('hook:start'); // passes the hook data to the event handler
  server.event('hook:complete'); // passes the hook data and result data to the event handler

  const settings = Object.assign({}, defaults, options);

  async.autoInject({
    db(done) {
      mongo.connect(settings.mongo.host, done);
    },
    collection(db, done) {
      done(null, db.collection(settings.mongo.collectionName));
    },
    index(collection, done) {
      collection.createIndex({ status: 1 }, { background: true }, done);
    },
    decorate(collection, done) {
      const doHook = (hookName, hookData, hookOptions) => {
        hook(server, settings, collection, hookName, hookData, hookOptions || {});
      };

      const doRetry = (hookId, callback) => {
        retry(server, settings, collection, hookId, (err, response) => {
          if (err) {
            return callback(err);
          }

          callback(err, response.performActions);
        });
      };

      if (settings.decorate) {
        server.decorate('server', 'hook', doHook);
        server.decorate('server', 'retryHook', doRetry);
      } else {
        server.method('hook', doHook);
        server.method('retryHook', doRetry);
      }

      done();
    },
    recurring(decorate, done) {
      const hookFunction = settings.decorate ? server.hook : server.methods.hook;

      server.ext({
        type: 'onPostStart',
        method(serv, cb) {
          Object.keys(settings.recurring).forEach(hookId => {
            const hookObj = settings.recurring[hookId];
            const hookData = hookObj.data || {};
            hookFunction(hookObj.hook, hookData, {
              runEvery: hookObj.schedule,
              hookId
            });
          });

          cb();
        }
      });

      done();
    },
    process(db, collection, done) {
      let continueProcessing = true;

      server.ext({
        type: 'onPreStop',
        method: (request, cb) => {
          continueProcessing = false;
          db.close(false, cb);
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
      done();
    }
  }, next);
};

exports.register.attributes = {
  pkg: require('./package.json')
};
