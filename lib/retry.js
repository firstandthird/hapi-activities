const async = require('async');
const executeHook = require('./executeHook');

module.exports = (server, settings, collection, hookId, allDone) => {
  collection.findOne({ _id: hookId }, (err, result) => {
    if (err) {
      return allDone(err);
    }

    if (!result) {
      const notFound = `hook ${hookId} not found`;
      server.log(['hapi-hooks', 'error'], { message: notFound });
      return allDone(new Error(notFound));
    }

    if (result.status !== 'failed') {
      const message = `hook ${hookId} did not fail previously, skipping retry attempt`;
      server.log(['hapi-hooks', 'repeat'], { message });
      return allDone(new Error(message));
    }

    async.autoInject(executeHook(server, settings, collection, result), allDone);
  });
};
