'use strict';
const setup = require('./setup.js');
const tap = require('tap');
const async = require('async');
const hookStatus = require('../lib/hookStatus');
const retry = require('../lib/retry');

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
    const numberOfCalls = {
      breakfast: 0
    };
    server.method('breakfast', (data, callback) => {
      if (numberOfCalls.breakfast === 2) {
        return callback();
      }
      numberOfCalls.breakfast ++;
      return callback('I am an error');
    });
    server.methods.hook('before school', {
      name: 'sven',
      age: 5
    });
    server.on('hook:complete', () => {
      if (numberOfCalls.breakfast === 2) {
        // check the db object:
        collection.findOne({}, (err2, hook) => {
          t.equal(hook.results.length, 1);
          t.equal(hook.results[0].error, 'I am an error');
          return done(t);
        });
      }
    });
  });
});

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

tap.test('supports the runAfter option', (t) => {
  setup({
    mongo: {
      host: 'mongodb://localhost:27017/hooks',
      collectionName: 'hapi-hooks-test'
    },
    interval: 100,
    hooks: {
      'after school': [
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
    server.methods.hook('after school', {
      name: 'bob',
      age: 7
    }, {
      runAfter: new Date(new Date().getTime() + 250)
    });
    let called = false;
    server.on('hook:complete', () => {
      if (called) {
        return;
      }
      called = true;
      const endTime = new Date().getTime();
      t.equal(endTime - startTime > 250, true, 'starts after specified runAfter time');
      return done(t);
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
      'after school': [
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
    server.methods.hook('after school', {
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
    server.methods.hook('after school', {
      name: 'bob',
      age: 7
    }, {
      runEvery: 'every 2 seconds'
    });
    async.until(
      () => called.length === 3,
      (skip) => setTimeout(skip, 200),
      () => {
        t.equal(called[0], 'query', 'call query first');
        t.equal(called[1], 'start', 'call start second');
        t.equal(called[2], 'complete', 'call complete third');
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

tap.test('retry hooks that hang longer than 5 mins', (t) => {
  let numberOfCalls = 0;
  let called = false;
  setup({
    mongo: {
      host: 'mongodb://localhost:27017/hooks',
      collectionName: 'hapi-hooks-test'
    },
    interval: 1000,
    hooks: {
      retry: [
        'kickball',
      ]
    }
  }, (server, collection, db, allDone) => {
    async.autoInject({
      method(done) {
        server.method('kickball', (data, callback) => {
          numberOfCalls ++;
          callback(null, numberOfCalls);
        });
        collection.insertOne({
          _id: '59cc6efbe7da67684da4f3e4',
          added: new Date(),
          hookData: {},
          hookName: 'retry',
          startedOn: new Date(new Date() - 1000 * 60 * 60 * 5),
          status: 'processing'
        }, done);
      },
      event(method, done) {
        server.on('hook:query', (result) => {
          if (numberOfCalls > 0) {
            return done();
          }
        });
      },
    }, (err, result) => {
      t.equal(err, null);
      allDone(t);
    });
  });
});

tap.test('will manually retry only if status was not "failed"', (t) => {
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
        retry(server, {}, collection, 'myHookId', true, (err) => {
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
        interval: 1000,
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
        server.methods.hook('repeat', {});
        return done(null, { server, collection, cleanup });
      });
    },
    // wait for the hook to fire, since key is 0 it won't work:
    wait(startup, done) {
      setTimeout(done, 1500);
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
