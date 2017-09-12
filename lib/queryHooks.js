'use strict';
const async = require('async');
const executeHook = require('./executeHook');
const hookStatus = require('./hookStatus');

module.exports = (server, settings, collection, allDone) => {
  async.autoInject({
    outstandingHooks(done) {
      hookStatus(collection, done);
    },
    logHooks(outstandingHooks, done) {
      if (settings.log) {
        server.log(['hapi-hooks', 'status'], outstandingHooks);
      }
      const proceed = outstandingHooks.processing === 0;
      if (!proceed && settings.log) {
        server.log(['hapi-hooks', 'warning'], `There are still ${outstandingHooks.processing} hooks in the queue.`);
      }
      done(null, proceed);
    },
    hooks(logHooks, done) {
      // don't process anything if there were still tasks processing
      if (!logHooks) {
        return done(null, []);
      }
      collection.find({
        status: {
          $in: ['waiting', 'failed']
        },
        runAfter: {
          $lte: new Date()
        }
      }).limit(settings.batchSize).toArray(done);
    },
    execute(hooks, done) {
      async.each(hooks, (hook, eachDone) => {
        async.autoInject(executeHook(server, settings, collection, hook), eachDone);
      }, done);
    },
  }, (err, results) => {
    if (err) {
      return allDone(err);
    }
    return allDone(null, results.execute);
  });
};
