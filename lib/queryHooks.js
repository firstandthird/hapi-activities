'use strict';
const async = require('async');
const executeHook = require('./executeHook');
const checkHooks = require('./logHooks');

module.exports = (server, settings, collection, allDone) => {
  async.autoInject({
    outstandingHooks(done) {
      checkHooks(collection, done);
    },
    logHooks(outstandingHooks, done) {
      server.log(['hapi-hooks', 'status'], outstandingHooks);
      // does logging statement, checks if need to continue:
      if (outstandingHooks.processing !== 0) {
        server.log(['hapi-hooks', 'busy'], `There are still ${outstandingHooks.processing} hooks in the queue.`);
        return allDone();
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
          return allDone(dbErr);
        }
        // can go back to sleep if nothing was found:
        if (results.length === 0) {
          return allDone();
        }
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
