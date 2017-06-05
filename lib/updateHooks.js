'use strict';
const automap = require('automap');
const executeHook = require('./executeHook');

module.exports = (server, settings, collection, allDone) => {
  automap(
    // fetch all 'waiting' hooks where 'runAfter' has expired:
    (done) => {
      collection
      .find({
        status: 'waiting',
        runAfter: {
          $lte: new Date()
        }
      })
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
    (hook, done) => { return executeHook(server, settings, collection, hook, done); },
    (hook, results) => results,
    allDone);
};
