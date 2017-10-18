const async = require('async');
const get = require('lodash.get');
const str2fn = require('str2fn');

const formatError = require('./methods/formatError');
const setStatus = require('./methods/setStatus');

// returns an async autoInject object that will execute the hooks
module.exports = function(server, settings, collection, hook) {
  return {
    checkRetryCount(done) {
      if (!hook.runCount || hook.runCount < settings.maxRetries) {
        return done();
      }

      setStatus(server, settings, collection, hook, 'aborted', () => done('Max retries. Aborting'));
    },
    setProcessing(checkRetryCount, done) {
      setStatus(server, settings, collection, hook, 'processing', done);
    },
    performActions(setProcessing, done) {
      const updateHook = {
        results: []
      };

      async.eachLimit(settings.hooks[hook.hookName], settings.concurrent, (action, eachDone) => {
        let actionData = hook.hookData;

        if (typeof action === 'object') {
          actionData = Object.assign(action.data, actionData);
          action = action.method;
        }

        if (typeof action === 'string' && action.indexOf('(') !== -1) {
          return str2fn.execute(action, server.methods, Object.assign({}, hook.hookData), (error, output) => {
            if (error) {
              updateHook.results.push({ action, error: formatError(error) });
              updateHook.status = 'failed';
            } else {
              updateHook.results.push({ action, output });
            }

            eachDone();
          });
        }

        let actionCall = get(server.methods, action);

        if (settings.timeout) {
          actionCall = async.timeout(get(server.methods, action), settings.timeout);
        }

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
        done(null, updateHook);
      });
    },
    completeHooks(performActions, done) {
      const updateHook = {
        results: performActions.results,
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
        repeating(update, next) {
          if (!hook.runEvery) {
            return next();
          }

          server.methods.hook(hook.hookName, hook.hookData, {
            runEvery: hook.runEvery,
            hookId: hook.hookId
          });
          next();
        }
      }, done);
    },
    logCompleted(completeHooks, performActions, done) {
      server.emit('hook:complete', { hook, results: performActions.results });

      if (settings.log) {
        if (performActions.status === 'failed') {
          const err = performActions.results[0].error;
          const msg = {
            hook,
            data: performActions
          };
          /* istanbul ignore if */
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
            id: hook._id.toString(),
            name: hook.hookName,
            data: hook.hookData,
            hookId: hook.hookId,
            runEvery: hook.runEvery
          });
        }
      }

      done(null, performActions.results);
    }
  };
};
