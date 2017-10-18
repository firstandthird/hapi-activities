const setup = require('./setup.js');
const tap = require('tap');
const async = require('async');

tap.test('can handle and report hook errors during an action', (t) => {
  setup({
    log: false,
    mongo: {
      host: 'mongodb://localhost:27017/hooks',
      collectionName: 'hapi-hooks-test'
    },
    interval: 100,
    hooks: {
      'before school': ['breakfast']
    }
  }, (server, collection, db, done) => {
    const numberOfCalls = {
      breakfast: 0
    };
    server.method('breakfast', (data, callback) => {
      if (numberOfCalls.breakfast === 1) {
        return callback();
      }
      numberOfCalls.breakfast ++;
      return callback(new Error('this is a thrown error'));
    });
    server.methods.hook('before school', {
      name: 'sven',
      age: 5
    });
    server.on('hook:complete', () => {
      t.equal(numberOfCalls.breakfast, 1);
      done(t);
    });
  });
});


tap.test('calls hook server events', (t) => {
  setup({
    mongo: {
      host: 'mongodb://localhost:27017/hooks',
      collectionName: 'hapi-hooks-test'
    },
    interval: 500,
    hooks: {
      'events hook': [
        'kickball'
      ]
    }
  }, (server, collection, db, allDone) => {
    server.method('kickball', (data, callback) => {
      callback();
    });
    const called = [];
    server.on('hook:query', () => {
      called.push('query');
    });
    server.on('hook:start', () => {
      called.push('start');
    });
    server.on('hook:complete', () => {
      called.push('complete');
    });
    server.methods.hook('events hook', {
      name: 'bob',
      age: 7
    }, {
      runEvery: 'every 2 seconds'
    });
    async.until(
      () => called.length > 3,
      (skip) => setTimeout(skip, 200),
      () => {
        t.ok(called.includes('query'), 'call query first');
        t.ok(called.includes('start'), 'start', 'call start second');
        t.ok(called.includes('complete'), 'complete', 'call complete third');
        allDone(t);
      });
  });
});
