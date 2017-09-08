'use strict';

module.exports = (server, settings, collection, hookName, hookData, hookOptions) => {
  // verify that this hook exists:
  if (!settings.hooks[hookName]) {
    return;
  }

  const data = {
    hookName,
    hookData,
    runAfter: hookOptions.runAfter || new Date(),
    status: 'waiting',
    added: new Date()
  };

  if (hookOptions.recurringId && hookOptions.runEvery) {
    data.runEvery = hookOptions.runEvery;
    data.recurringId = hookOptions.recurringId;

    collection.updateOne({
      recurringId: data.recurringId
    }, data, { upsert: true }, (insertErr) => {
      if (insertErr) {
        server.log(['hapi-hooks', 'error'], { error: insertErr, name: hookName, recurringId: data.recurringId });
      }
      if (settings.log) {
        server.log(['hapi-hooks', 'update-hook', 'debug'], { message: `Updating a hook: '${hookName}'`, data: hookData, recurringId: data.recurringId });
      }
    });
  } else {
    collection.insertOne(data, (insertErr) => {
      if (insertErr) {
        server.log(['hapi-hooks', 'error'], { error: insertErr, name: hookName });
      }
      if (settings.log) {
        server.log(['hapi-hooks', 'new-hook', 'debug'], { message: `Registering a new hook: '${hookName}'`, data: hookData });
      }
    });
  }
};
