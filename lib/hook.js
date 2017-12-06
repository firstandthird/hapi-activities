const later = require('later');
const laterTimezone = require('later-timezone').timezone;
const async = require('async');

module.exports = (server, settings, collection, hookName, hookData, hookOptions) => {
  if (!settings.hooks[hookName]) {
    return;
  }

  async.autoInject({
    setup(done) {
      const data = {
        hookName,
        hookData,
        runAfter: hookOptions.runAfter || new Date(),
        status: 'waiting',
        added: new Date()
      };

      if (!hookOptions.hookId) {
        server.log(['hapi-hooks', 'deprecated', 'info'], { message: 'Set a hookId to prevent duplicate hooks.', hookName: data.hookName });
      }

      data.hookId = hookOptions.hookId;

      if (hookOptions.runEvery) {
        laterTimezone(later, settings.timezone);
        const schedule = later.parse.text(hookOptions.runEvery);

        if (schedule.error !== -1) {
          return done(`Invalid schedule ${hookOptions.runEvery} at ${schedule.error}`);
        }
        const next = new Date(later.schedule(schedule).next(1, new Date()));
        data.runAfter = next;
        data.runEvery = hookOptions.runEvery;
        data.hookId = hookOptions.hookId;
      }

      done(null, data);
    },
    existing(setup, done) {
      const data = setup;
      if (!data.hookId) {
        return done(null, 0);
      }

      collection.count({
        hookId: data.hookId,
        status: {
          $in: ['waiting', 'processing']
        }
      }, (err, count) => {
        done(err, count);
      });
    },
    insert(existing, setup, done) {
      const data = setup;

      if (existing) {
        delete data.added;
        delete data.status;

        collection.updateOne({
          hookId: data.hookId
        }, { $set: data }, err => {
          if (err) {
            return done(err);
          }

          if (settings.log) {
            server.log(['hapi-hooks', 'updated-hook', 'debug'], {
              message: `Updating a hook: '${hookName}'`,
              data: hookData,
              options: hookOptions,
              runAfter: data.runAfter
            });
          }

          done();
        });

        return;
      }

      collection.insertOne(data, err => {
        if (err) {
          return done(err);
        }

        if (settings.log) {
          server.log(['hapi-hooks', 'new-hook', 'debug'], {
            message: `Registering a new hook: '${hookName}'`,
            data: hookData,
            options: hookOptions,
            runAfter: data.runAfter
          });
        }

        done();
      });
    }
  }, err => {
    if (err) {
      server.log(['hapi-hooks', 'error'], { error: err });
    }
  });
};
