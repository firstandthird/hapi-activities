module.exports = (server, settings, collection, hook, status, done) => {
  collection.update({ _id: hook._id }, { $set: { status } }, err => {
    if (err) {
      server.log(['hapi-hooks', 'error'], { error: err, name: hook.hookName });
    }

    /* istanbul ignore if */
    if (settings.log) {
      server.log(['hapi-hooks', 'setting-status', 'debug'], { message: `Setting status to ${status}`, data: hook });
    }

    done();
  });
};
