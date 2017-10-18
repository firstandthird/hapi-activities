const setup = require('./setup.js');
const tap = require('tap');

tap.test('supports the runAfter option', (t) => {
  setup({
    mongo: {
      host: 'mongodb://localhost:27017/hooks',
      collectionName: 'hapi-hooks-test'
    },
    interval: 100,
    hooks: {
      'runAfter hook': [
        'kickball'
      ]
    }
  }, (server, collection, db, done) => {
    const numberOfCalls = {
      kickball: 0
    };
    server.method('kickball', (data, callback) => {
      numberOfCalls.kickball ++;
      callback(null, numberOfCalls.kickball);
    });
    const startTime = new Date().getTime();
    server.methods.hook('runAfter hook', {
      name: 'bob',
      age: 7
    }, {
      runAfter: new Date(new Date().getTime() + 250)
    });
    let called = false;
    server.on('hook:complete', () => {
      if (called) {
        return done(t);
      }

      called = true;
      const endTime = new Date().getTime();
      t.equal(endTime - startTime > 250, true, 'starts after specified runAfter time');
      return done(t);
    });
  });
});
