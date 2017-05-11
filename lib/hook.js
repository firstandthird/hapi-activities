'use strict';

module.exports = (server, settings, collection, hookName, hookData, hookOptions) => {
  // verify that this hook exists:
  if (!settings.hooks[hookName]) {
    return;
  }
  collection.insertOne({
    hookName,
    hookData,
    runAfter: hookOptions.runAfter || new Date(),
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
};
