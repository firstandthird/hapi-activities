const setup = require('./setup.js');
const tap = require('tap');

tap.test('can handle and report callback errors during an action', (t) => {
  setup({
    mongo: {
      host: 'mongodb://localhost:27017/hooks',
      collectionName: 'hapi-hooks-test'
    },
    interval: 100,
    hooks: {
      'before school': ['breakfast']
    }
  }, (server, collection, db, done) => {
    server.method('breakfast', (data, callback) => callback('I am an error'));

    server.methods.hook('before school', {
      name: 'sven',
      age: 5
    });

    server.on('hook:complete', () => {
      collection.findOne({}, (err2, hook) => {
        t.equal(hook.results.length, 1);
        t.equal(hook.results[0].error, 'I am an error');
        return done(t);
      });
    });
  });
});


tap.test('will return error if hook id does not exist', (t) => {
  setup({
    mongo: {
      host: 'mongodb://localhost:27017/hooks',
      collectionName: 'hapi-hooks-test'
    },
    interval: 1000,
    hooks: {
      repeat: [
        'repeatableHook()',
      ]
    }
  }, (server, collection, db, done) => {
    server.methods.retryHook('does_not_exist', (err, res) => {
      t.notEqual(err, null);
      done(t);
    });
  });
});

tap.test('will return error if hook id does not exist when used as decoration', (t) => {
  setup({
    mongo: {
      host: 'mongodb://localhost:27017/hooks',
      collectionName: 'hapi-hooks-test'
    },
    interval: 1000,
    decorate: true,
    hooks: {
      repeat: [
        'repeatableHook()',
      ]
    }
  }, (server, collection, db, done) => {
    server.retryHook('does_not_exist', (err, res) => {
      t.notEqual(err, null);
      done(t);
    });
  });
});
