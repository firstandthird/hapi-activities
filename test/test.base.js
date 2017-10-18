const setup = require('./setup.js');
const tap = require('tap');
const async = require('async');
const hookStatus = require('../lib/hookStatus');

tap.test('adds a server method that will process an hook composed of actions', (t) => {
  setup({
    mongo: {
      host: 'mongodb://localhost:27017/hooks',
      collectionName: 'hapi-hooks-test'
    },
    interval: 100,
    hooks: {
      'after school': [
        'kickball',
        'trumpet',
        'pottery',
      ]
    }
  }, (server, collection, db, allDone) => {
    const numberOfCalls = {
      kickball: 0,
      trumpet: 0,
      pottery: 0
    };
    server.method('kickball', (data, callback) => {
      numberOfCalls.kickball ++;
      callback(null, numberOfCalls.kickball);
    });
    server.method('trumpet', (data, callback) => {
      numberOfCalls.trumpet = data.age;
      callback(null, numberOfCalls.trumpet);
    });
    server.method('pottery', (data, callback) => {
      numberOfCalls.pottery ++;
      callback(null, numberOfCalls.pottery);
    });
    let called = 0;
    server.on('hook:complete', (outcome) => {
      const results = outcome.results;
      if (outcome.hook.hookData.name === 'bob') {
        t.equal(results.length, 3, 'reports outcomes for each hook action');
        t.equal(results[1].action, 'trumpet', 'reports action name for each hook action');
        t.equal(results[1].output, 7, 'reports output of each hook action');
        called++;
      } else {
        t.equal(results.length, 3, 'reports outcomes for each hook action');
        t.equal(results[1].action, 'trumpet', 'reports action name for each hook action');
        t.equal(results[1].output, 5, 'reports output of each hook action');
        called++;
      }
      if (called === 2) {
        collection.findOne({}, (err, result) => {
          t.equal(err, null);
          t.equal(result.status, 'complete');
          t.equal(result.results.length, 3);
          return allDone(t);
        });
      }
    });
    server.methods.hook('after school', {
      name: 'bob',
      age: 7
    });
    server.methods.hook('after school', {
      name: 'sven',
      age: 5
    });
  });
});

tap.test('adds a server method that will process another server method and data', (t) => {
  let numberOfCalls = 0;
  setup({
    mongo: {
      host: 'mongodb://localhost:27017/hooks',
      collectionName: 'hapi-hooks-test'
    },
    interval: 100,
    hooks: {
      'user.add': [
        'addToMailchimp("someId", user.email)',
      ]
    }
  }, (server, collection, db, done) => {
    server.method('addToMailchimp', (id, email, callback) => {
      t.equal(email, 'bob@bob.com', 'resolves and passes data to method call');
      t.equal(id, 'someId', 'resolves and passes data to method');
      numberOfCalls ++;
      return callback(null, numberOfCalls);
    });
    server.methods.hook('user.add', { user: { email: 'bob@bob.com' } });
    server.on('hook:complete', () => {
      t.equal(numberOfCalls > 0, true, 'calls correct number of times');
      done(t);
    });
  });
});

tap.test('supports foo.bar for methods', (t) => {
  setup({
    mongo: {
      host: 'mongodb://localhost:27017/hooks',
      collectionName: 'hapi-hooks-test'
    },
    interval: 100,
    hooks: {
      'after school': ['foo.bar']
    }
  }, (server, collection, db, done) => {
    let numberOfCalls = 0;
    server.method('foo.bar', (data, callback) => {
      numberOfCalls ++;
      callback();
    });
    server.methods.hook('after school', {
      name: 'bob',
      age: 7
    });
    let called = false;
    server.on('hook:complete', () => {
      if (called) {
        return;
      }
      called = true;
      t.equal(numberOfCalls > 0, true);
      done(t);
    });
  });
});

tap.test('"decorate" option will register the method with "server.decorate" instead of "server.method"', (t) => {
  setup({
    decorate: true,
    mongo: {
      host: 'mongodb://localhost:27017/hooks',
      collectionName: 'hapi-hooks-test'
    },
    interval: 100,
    hooks: {
      'after school': [
        'kickball',
        'trumpet',
        'pottery',
      ]
    }
  }, (server, collection, db, done) => {
    const numberOfCalls = {
      kickball: 0,
      trumpet: 0,
      pottery: 0
    };
    server.method('kickball', (data, callback) => {
      numberOfCalls.kickball ++;
      callback(null, numberOfCalls.kickball);
    });
    server.method('trumpet', (data, callback) => {
      numberOfCalls.trumpet = data.age;
      callback(null, numberOfCalls.trumpet);
    });
    server.method('pottery', (data, callback) => {
      numberOfCalls.pottery ++;
      callback(null, numberOfCalls.pottery);
    });
    server.hook('after school', {
      name: 'bob',
      age: 7
    });
    server.on('hook:complete', () => {
      t.equal(numberOfCalls.kickball, 1);
      t.equal(numberOfCalls.trumpet, 7);
      t.equal(numberOfCalls.pottery, 1);
      done(t);
    });
  });
});

tap.test('handles actions passed in a { method s: <method>, data: <data> } form', (t) => {
  let passedData = null;
  setup({
    mongo: {
      host: 'mongodb://localhost:27017/hooks',
      collectionName: 'hapi-hooks-test'
    },
    interval: 100,
    hooks: {
      models: [{
        method: 'airplanes',
        data: { data1: 'is data 1' }
      }]
    }
  }, (server, collection, db, done) => {
    server.method('airplanes', (data, callback) => {
      passedData = data;
      callback(null, passedData);
    });
    server.methods.hook('models', { data2: 'is data 2' });
    server.methods.hook('models', { data1: 'is data 2' });
    let called = 0;
    server.on('hook:complete', (outcome) => {
      if (outcome.hook.hookData.data2 === 'is data 2') {
        called++;
      } else {
        called++;
      }
      if (called === 2) {
        return done(t);
      }
    });
  });
});

tap.test('will not add an hook if it does not exist', (t) => {
  setup({
    mongo: {
      host: 'mongodb://localhost:27017/hooks',
      collectionName: 'hapi-hooks-test'
    },
    interval: 100,
    hooks: {} // no hooks
  }, (server, collection, db, done) => {
    server.methods.hook('perpetual motion', {});
    setTimeout(() => {
      done(t);
    }, 250);
  });
});

tap.test('hook status only shows hooks that have completed since last run', (t) => {
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
    const intervalTime = new Date();
    async.autoInject({
      insert1(done) {
        // completedOn is previous to the last interval time:
        collection.insert({ status: 'complete', completedOn: new Date(intervalTime.getTime() - 1000) }, done);
      },
      status1(insert1, done) {
        hookStatus(collection, intervalTime, done);
      },
      verify1(status1, done) {
        t.equal(status1.complete, 0, 'does not return hooks completed before interval time');
        done();
      },
      insert2(verify1, done) {
        // completedOn is after the last interval time:
        collection.insert({ status: 'complete', completedOn: new Date(intervalTime.getTime() + 1000) }, done);
      },
      status2(insert2, done) {
        hookStatus(collection, intervalTime, done);
      },
      verify2(status2, done) {
        t.equal(status2.complete, 1, 'returns hooks completed after interval time');
        done();
      }
    }, () => {
      allDone(t);
    });
  });
});

tap.test('will wait to process next batch of hooks until all previous hooks are done', (t) => {
  setup({
    mongo: {
      host: 'mongodb://localhost:27017/hooks',
      collectionName: 'hapi-hooks-test'
    },
    log: false,
    interval: 1000,
    hooks: {
      'before school': [
        'dodgeball'
      ],
      'after school': [
        'kickball'
      ]
    }
  }, (server, collection, db, done) => {
    let intervals = 0;
    server.method('kickball', (data, callback) => {
      // block until all intervals are done:
      async.until(
        () => intervals > 6,
        (skip) => setTimeout(skip, 10),
        callback);
    });
    // will wait until 'kickball' exits to run again
    server.method('dodgeball', (data, callback) => {
      // return immediately,
      callback();
    });
    server.on('hook:query', (data) => {
      intervals++;
      if (intervals > 6) {
        t.equal(data.complete < 3, true, 'finished only 1 or 2 processes in 7 intervals');
        return done(t);
      }
    });
    server.methods.hook('before school', {}, {
      runEvery: 'every 1 seconds',
      hookId: 'beforeSchool'
    });
    server.methods.hook('after school', {}, {
      runEvery: 'every 1 seconds',
      hookId: 'afterSchool'
    });
  });
});

tap.test('hookId updates existing hook', (t) => {
  setup({
    mongo: {
      host: 'mongodb://localhost:27017/hooks',
      collectionName: 'hapi-hooks-test'
    },
    interval: 500,
    hooks: {
      'hookId update': [
        'updateHook'
      ]
    }
  }, (server, collection, db, done) => {
    const date1 = new Date(new Date().getTime() + 250);
    const date2 = new Date(new Date().getTime() + 3500);
    async.autoInject({
      addHook(cb) {
        server.methods.hook('hookId update', { name: 'test1' }, { hookId: 'hookid-update', runAfter: date1 });
        setTimeout(cb, 200);
      },
      checkCount(addHook, cb) {
        collection.find({ hookId: 'hookid-update' }).toArray((err, res) => {
          if (err) {
            return cb(err);
          }

          t.equal(res.length, 1, 'Only one hook');
          cb();
        });
      },
      updateHook(checkCount, cb) {
        server.methods.hook('hookId update', { name: 'test2' }, { hookId: 'hookid-update', runAfter: date2 });
        setTimeout(cb, 200);
      },
      checkUpdated(updateHook, cb) {
        collection.find({ hookId: 'hookid-update' }).toArray((err, res) => {
          if (err) {
            return cb(err);
          }

          t.equal(res.length, 1, 'Still only one hook');
          t.notEqual(res[0].runAfter, date1, 'Run after updates');
          t.equal(res[0].hookData.name, 'test2', 'Run after updates');
          cb();
        });
      }
    }, () => {
      done(t);
    });
  });
});
