'use strict';

const later = require('later');
const laterTimezone = require('later-timezone').timezone;

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
      laterTimezone(later, settings.timezone);
      const schedule = later.parse.text(hookOptions.runEvery);
      
      if (schedule.error !== -1) {
        server.log(['hapi-hooks', 'error', 'schedule'], { message: `Invalid schedule ${hookOptions.runEvery} at ${schedule.error}` });
        throw new Error('Invalid schedule');
        return next('BAD');
      }
      const next = later.schedule(schedule).next(1, new Date(new Date().getTime() + ((1 * 60 * 1000) + 500))); 
      data.runAfter = next;
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
