module.exports = (server, performActions, hook) => {
  if (performActions.status === 'failed') {
    const err = performActions.results[0].error;
    const msg = {
      hook,
      data: performActions
    };
    /* istanbul ignore if */
    if (err instanceof Error) {
      msg.message = err.message;
      msg.stack = err.stack;
    } else {
      msg.error = err;
    }
    server.log(['hapi-hooks', 'error'], { error: msg, name: hook.hookName });
  } else {
    server.log(['hapi-hooks', 'complete', 'debug'], {
      message: 'Hook complete',
      id: hook._id.toString(),
      name: hook.hookName,
      data: hook.hookData,
      hookId: hook.hookId,
      runEvery: hook.runEvery
    });
  }
};
