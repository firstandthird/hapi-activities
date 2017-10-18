const setup = require('./setup.js');
const tap = require('tap');

tap.test('will allow recurring hooks to be passed in the config', (t) => {
  setup({
    mongo: {
      host: 'mongodb://localhost:27017/hooks',
      collectionName: 'hapi-hooks-test'
    },
    log: false,
    interval: 100,
    hooks: {
      'after:school': [
        'baseball'
      ]
    },
    recurring: {
      doBaseBall: {
        hook: 'after:school',
        schedule: 'every 1 second'
      }
    }
  }, (server, collection, db, done) => {
    let numberCalls = 0;
    server.on('hook:complete', () => {
      if (numberCalls > 5) {
        t.ok(true);
        return done(t);
      }
    });
    server.method('baseball', (data, next) => {
      numberCalls++;
      return next();
    });
  });
});

tap.test('supports the runEvery option', (t) => {
  setup({
    mongo: {
      host: 'mongodb://localhost:27017/hooks',
      collectionName: 'hapi-hooks-test'
    },
    log: false,
    interval: 100,
    hooks: {
      'runEvery hook': [
        'kickball'
      ]
    }
  }, (server, collection, db, done) => {
    const numberOfCalls = {
      kickball: 0
    };
    server.method('kickball', (data, callback) => {
      numberOfCalls.kickball ++;
      callback();
    });
    server.methods.hook('runEvery hook', {
      name: 'bob',
      age: 7
    }, {
      runEvery: 'every 1 seconds',
      hookId: 'afterSchool'
    });
    server.on('hook:complete', () => {
      if (numberOfCalls.kickball > 2) {
        return done(t);
      }
    });
  });
});
