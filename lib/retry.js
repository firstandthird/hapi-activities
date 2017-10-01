'use strict';
const async = require('async');
const executeHook = require('./executeHook');

module.exports = (server, settings, collection, hookId, manualRetry, allDone) => {
  collection.find({ _id: hookId }).toArray((error, result) => {
    // could be a db error:
    /* istanbul ignore if */
    if (error) {
      return allDone(error);
    }
    // or it might not exist:
    if (result.length === 0) {
      const notFound = `hook ${hookId} not found`;
      server.log(['hapi-hooks', 'error'], { message: notFound });
      return allDone(new Error(notFound));
    }
    if (manualRetry && result[0].status !== 'failed') {
      error = new Error(`hook ${hookId} did not fail previously, skipping manual retry attempt`);
      server.log(['hapi-hooks', 'repeat'], { message: `hook ${hookId} did not fail, skipping manual retry attempt`, error });
      return allDone(error);
    }
    async.autoInject(executeHook(server, settings, collection, result[0]), allDone);
  });
};
