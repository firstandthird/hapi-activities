'use strict';
const async = require('async');
const get = require('lodash.get');
const str2fn = require('str2fn');
const later = require('later');

const formatError = function(error) {
  let errorMsg = error;

  if (error instanceof Error) {
    errorMsg = error.message || 'Undefined error message';
  }

  return errorMsg;
};

// returns an async op that will execute the hooks
module.exports = function(server, settings, collection, hook) {
  return {
    // log that it's underway:
    checkRetryCount(done) {
      if (hook.runCount && hook.runCount >= settings.maxRetries) {
        collection.update({ _id: hook._id }, { $set: { status: 'aborted' } }, (err) => {
          if (err) {
            server.log(['hapi-hooks', 'error'], { error: err, name: hook.hookName });
          }
          if (settings.log) {
            server.log(['hapi-hooks', 'aborting', 'debug'], { message: 'Aborting hook', data: hook });
          }
          return done('Max retries reached, aborting.');
        });
      } else {
        return done();
      }
    },
    logHook(checkRetryCount, done) {
      collection.update({ _id: hook._id }, { $set: { status: 'processing' } }, (err) => {
        if (err) {
          server.log(['hapi-hooks', 'error'], { error: err, name: hook.hookName });
        }
        if (settings.log) {
          server.log(['hapi-hooks', 'starting-hook', 'debug'], { message: 'Processing underway for hook', data: hook });
        }
        done();
      });
    },
    // execute the actions in parallel:
    performActions(logHook, done) {
      // will launch the hook's actions in parallel:
      const updateHook = {
        results: []
      };
      async.eachLimit(settings.hooks[hook.hookName], settings.concurrent, (action, eachDone) => {
        // finish only executes the callback the first time it is called:
        let actionData = hook.hookData;
        // merge any default parameters for this action:
        if (typeof action === 'object') {
          actionData = Object.assign(action.data, actionData);
          action = action.method;
        }
        if (typeof action === 'string') {
          // if it's a method:
          if (action[action.length - 1] === ')' && (action.indexOf('(') > -1)) {
            return str2fn.execute(action, server.methods, Object.assign({}, hook.hookData), (error, output) => {
              if (error) {
                updateHook.results.push({ action, error: formatError(error) });
                updateHook.status = 'failed';
              } else {
                updateHook.results.push({ action, output });
              }
              return eachDone();
            });
          }
        }
        // if a timeout is specified then put a timeout wrapper around the server method call:
        const actionCall = settings.timeout ? async.timeout(get(server.methods, action), settings.timeout) : get(server.methods, action);
        // now make the call:
        actionCall(actionData, (error, output) => {
          // will log async's ETIMEDOUT error, as well as other errors for this action:
          if (error) {
            updateHook.results.push({ action, error: formatError(error) });
            updateHook.status = 'failed';
          } else {
            updateHook.results.push({ action, output });
          }
          return eachDone();
        });
      }, () => {
        // when we have the results from all actions, we're ready to update the hook:
        done(null, updateHook);
      });
    },
    // update the hook with the results of processing the actions:
    completeHook(performActions, done) {
      const updateHook = {
        results: performActions.results,
        // if any of the actions 'failed' then the hook status is 'failed':
        status: (performActions.status === 'failed') ? 'failed' : 'complete',
        completedOn: new Date()
      };
      async.autoInject({
        update(next) {
          collection.update({ _id: hook._id }, {
            $set: updateHook,
            $inc: {
              runCount: 1
            }
          }, next);
        },
        repeating(next) {
          if (!hook.runEvery) {
            return next();
          }

          const schedule = later.parse.text(hook.runEvery);
          const runAfter = later.schedule(schedule).next(2);
          server.methods.hook(hook.hookName, hook.hookData, {
            runAfter: runAfter[1],
            runEvery: hook.runEvery,
            hookId: hook.hookId || hook.recurringId
          });

          next();
        }
      }, done);
    },
    logComplete(completeHook, performActions, done) {
      if (settings.log) {
        if (performActions.status === 'failed') {
          const err = performActions.results[0].error;
          const msg = {
            hook,
            data: performActions
          };
          if (err instanceof Error) {
            msg.message = err.message;
            msg.stack = err.stack;
          } else {
            msg.error = err;
          }
          server.log(['hapi-hooks', 'error'], { error: msg, name: hook.hookName });
        } else {
          server.log(['hapi-hooks', 'complete', 'debug'], {
            message: 'Hook complete',
            status: performActions.status,
            hook
          });
        }
      }
      done(null, performActions.results);
    }
  };
};
