'use strict';
const async = require('async');
const executeHook = require('./executeHook');

module.exports = (server, settings, collection, hookId, allDone) => {
  collection.find({ _id: hookId }).toArray((error, result) => {
    if (error) {
      return server.log(['hapi-hooks', 'error'], { message: `hook ${hookId} not found`, error });
    }
    if (result[0].status !== 'failed') {
      error = new Error(`hook ${hookId} did not fail previously, skipping retry attempt`);
      server.log(['hapi-hooks', 'repeat'], { message: `hook ${hookId} did not fail, skipping retry attempt`, error });
      return allDone(error);
    }
    async.autoInject(executeHook(server, settings, collection, result[0]), allDone);
  });
};
