'use strict';
const mongo = require('mongodb');
const async = require('async');
const automap = require('automap');

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
  mongo.connect(settings.mongo.host, (err, db) => {
    if (err) {
      return next(err);
    }
    // initialize the server object:
    const collection = db.collection(settings.mongo.collectionName);

    // update all hooks:
    const updateHooks = (allDone) => {
      automap(
        // fetch all 'waiting' hooks
        (done) => {
          collection
          .find({ status: 'waiting' })
          .toArray((dbErr, results) => {
            if (dbErr) {
              return allDone(dbErr);
            }
            // can go back to sleep if nothing was found:
            if (results.length === 0) {
              return allDone();
            }
            done(null, results);
          });
        },
        // for each hook we just fetched, do the following process:
        (hook) => {
          return {
            // log that it's underway:
            logHook: (done) => {
              collection.update({ _id: hook._id }, { $set: { status: 'processing' } }, (err) => {
                if (err) {
                  server.log(['hapi-hooks', 'error'], err);
                }
                if (settings.log) {
                  server.log(['hapi-hooks', 'starting-hook', 'debug'], { message: 'Processing underway for hook', data: hook });
                }
                done();
              });
            },
            // execute the actions in parallel:
            performActions: ['logHook', (results, done) => {
              // will launch the hook's actions in parallel:
              const updateHook = {
                results: []
              };
              async.each(settings.hooks[hook.hookName], (action, eachDone) => {
                let actionData = hook.hookData;
                // merge any default parameters for this action:
                if (typeof action === 'object') {
                  actionData = Object.assign(action.data, actionData);
                  action = action.method;
                }
                // if a timeout is specified then put a timeout wrapper around the server method call:
                const actionCall = settings.timeout ? async.timeout(server.methods[action], settings.timeout) : server.methods[action];
                // now make the call:
                try {
                  actionCall(actionData, (error, output) => {
                    // will log async's ETIMEDOUT error, as well as other errors for this action:
                    if (error) {
                      updateHook.results.push({ action, error });
                      updateHook.status = 'failed';
                    } else {
                      updateHook.results.push({ action, output });
                    }
                    return eachDone();
                  });
                } catch (e) {
                  updateHook.results.push({ action, error: `${e.name} ${e.message} ` });
                  updateHook.status = 'failed';
                  eachDone();
                }
              }, () => {
                // when we have the results from all actions, we're ready to update the hook:
                done(null, updateHook);
              });
            }],
            // update the hook with the results of processing the actions:
            completeHook: ['performActions', (previous, done) => {
              const updateHook = {
                results: previous.performActions.results,
                // if any of the actions 'failed' then the hook status is 'failed':
                status: (previous.performActions.status === 'failed') ? 'failed' : 'complete',
                completedOn: new Date()
              };
              collection.update({ _id: hook._id }, { $set: updateHook }, done);
            }]
          };
        },
      allDone);
    };

    // register the 'hook' method with the server:
    server.method('hook', (hookName, hookData) => {
      // verify that this hook exists:
      if (!settings.hooks[hookName]) {
        return;
      }
      collection.insertOne({
        hookName,
        hookData,
        status: 'waiting',
        added: new Date()
      }, (insertErr) => {
        if (insertErr) {
          server.log(['hapi-hooks', 'error'], insertErr);
        }
        if (settings.log) {
          server.log(['hapi-hooks', 'new-hook', 'debug'], { message: `Registering a new hook: '${hookName}'`, data: hookData });
        }
      });
    });

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
      updateHooks((err) => {
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
