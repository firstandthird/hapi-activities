'use strict';
const setup = require('./setup.js');
const tap = require('tap');
const async = require('async');

tap.test('calls hook server events', (t) => {
  setup({
    mongo: {
      host: 'mongodb://localhost:27017/hooks',
      collectionName: 'hapi-hooks-test'
    },
    interval: 500,
    hooks: {
      'after school': [
        'kickball'
      ]
    }
  }, (server, collection, db, allDone) => {
    server.method('kickball', (data, callback) => {
      callback();
    });
    async.autoInject({
      one(done) {
        server.on('hook:query', () => {
          console.log('one')
          done();
        });
      },
      two(done) {
        server.on('hook:start', () => {
          console.log('two')
          done();
        });
      },
      three(done) {
        server.on('hook:complete', () => {
          console.log('three')
          done();
        });
      }
    }, () => allDone(t));
    server.methods.hook('after school', {
      name: 'bob',
      age: 7
    }, {
      runEvery: 'every 1 seconds'
    });
  });
});
