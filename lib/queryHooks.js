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
      // does logging statement, checks if need to continue:
      if (outstandingHooks.processing !== 0) {
        return done(new Error(`There are still ${outstandingHooks.processing} hooks in the queue.`));
      }
      done();
    },
    hooks(logHooks, done) {
      collection.find({
        status: {
          $in: ['waiting', 'failed']
        },
        runAfter: {
          $lte: new Date()
        }
      }).limit(settings.batchSize).toArray((dbErr, results) => {
        if (dbErr) {
          return done(dbErr);
        }
        // will not process anything if nothing was found:
        done(null, results);
      });
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
