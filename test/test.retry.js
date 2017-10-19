const setup = require('./setup.js');
const tap = require('tap');
const async = require('async');
const retry = require('../lib/retry');

tap.test('will not retry if status was not "failed" ', (t) => {
  setup({
    mongo: {
      host: 'mongodb://localhost:27017/hooks',
      collectionName: 'hapi-hooks-test'
    },
    log: false,
    interval: 200,
    hooks: {
      'before school': [
        'dodgeball'
      ]
    }
  }, (server, collection, db, allDone) => {
    async.autoInject({
      insert1(done) {
        collection.insert({ _id: 'myHookId', status: 'complete' }, done);
      },
      retry1(insert1, done) {
        let called;
        server.on('log', (data) => {
          // only check this first time log is called:
          if (!called) {
            called = true;
            t.equal(data.tags[1], 'repeat', 'logs repeat message');
            t.notEqual(data.data.message.indexOf('myHookId did not fail'), -1, 'notifies hook id did not fail');
          }
        });
        retry(server, {}, collection, 'myHookId', (err) => {
          t.notEqual(err, null, 'calls callback if hook id was not "failed"');
          done();
        });
      },
    }, () => {
      allDone(t);
    });
  });
});


tap.test('retry a hook from id', (t) => {
  let key = 0; // our test hook won't pass while key is zero
  let numberOfCalls = 0;
  async.autoInject({
    startup(done) {
      setup({
        mongo: {
          host: 'mongodb://localhost:27017/hooks',
          collectionName: 'hapi-hooks-test'
        },
        interval: 100,
        hooks: {
          repeat: [
            'repeatableHook()',
          ]
        }
      }, (server, collection, db, cleanup) => {
        // this method  won't work until someone changes 'key':
        server.method('repeatableHook', (callback) => {
          if (key === 0) {
            return callback(new Error('key was zero'));
          }
          numberOfCalls++;
          return callback(null, true);
        });
        server.methods.hook('repeat', {}, { hookId: 'retry-from-id' });
        return done(null, { server, collection, cleanup });
      });
    },
    wait(startup, done) {
      setTimeout(done, 150);
    },
    // get the id for the failed job:
    id(startup, wait, done) {
      startup.collection.find({ status: 'failed' }).toArray(done);
    },
    retry(id, startup, done) {
      key = 1;
      startup.server.methods.retryHook(id[0]._id, done);
    }
  }, (err, result) => {
    t.equal(err, null);
    t.equal(numberOfCalls > 0, true);
    t.equal(result.retry.results.length, 1);
    t.equal(result.retry.results[0].output, true);
    result.startup.cleanup(t);
  });
});
