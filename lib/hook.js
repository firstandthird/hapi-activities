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

  // Back compat
  if (hookOptions.recurringId) {
    hookOptions.hookId = hookOptions.recurringId;
  }

  if (hookOptions.hookId) {
    if (hookOptions.runEvery) {
      data.runEvery = hookOptions.runEvery;
    }

    data.hookId = hookOptions.hookId;

    collection.updateOne({
      $or: [
        { hookId: data.hookId },
        { recurringId: data.hookId } // back compat
      ]
    }, data, { upsert: true }, (insertErr) => {
      if (insertErr) {
        server.log(['hapi-hooks', 'error'], { error: insertErr, name: hookName, hookId: data.hookId });
      }
      if (settings.log) {
        server.log(['hapi-hooks', 'update-hook', 'debug'], { message: `Updating a hook: '${hookName}'`, data: hookData, hookId: data.hookId });
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
