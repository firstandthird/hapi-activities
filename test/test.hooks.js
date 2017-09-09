'use strict';
const setup = require('./setup.js');
const test = require('tape');
const async = require('async');
/*
test('adds a server method that will process an hook composed of actions', (t) => {
  setup({
    mongo: {
      host: 'mongodb://localhost:27017',
      collectionName: 'hapi-hooks-test'
    },
    interval: 1000, // 1 second
    hooks: {
      'after school': [
        'kickball',
        'trumpet',
        'pottery',
      ]
    }
  }, (cleanup, server, collection, db) => {
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
    server.methods.hook('after school', {
      name: 'bob',
      age: 7
    });
    setTimeout(() => {
      t.equal(numberOfCalls.kickball, 1);
      t.equal(numberOfCalls.trumpet, 7);
      t.equal(numberOfCalls.pottery, 1);
      collection.findOne({}, (err, hook) => {
        t.equal(hook.status, 'complete');
        t.equal(hook.results.length, 3);
        server.methods.hook('after school', {
          name: 'sven',
          age: 5
        });
        setTimeout(() => {
          t.equal(numberOfCalls.kickball, 2);
          t.equal(numberOfCalls.trumpet, 5);
          t.equal(numberOfCalls.pottery, 2);
          collection.findOne({}, (err, hook2) => {
            t.equal(hook2.status, 'complete');
            t.equal(hook2.results.length, 3);
            cleanup(t);
          });
        }, 2500);
      });
    }, 2500);
  });
});

test('adds a server method that will process another server method and data', (t) => {
  let numberOfCalls = 0;
  setup({
    mongo: {
      host: 'mongodb://localhost:27017',
      collectionName: 'hapi-hooks-test'
    },
    interval: 1000, // 1 second
    hooks: {
      'user.add': [
        'addToMailchimp("someId", user.email)',
      ]
    }
  }, (cleanup, server, collection) => {
    server.method('addToMailchimp', (id, email, callback) => {
      t.equal(email, 'bob@bob.com', 'resolves and passes data to method call');
      t.equal(id, 'someId', 'resolves and passes data to method');
      numberOfCalls ++;
      return callback(null, numberOfCalls);
    });
    server.methods.hook('user.add', { user: { email: 'bob@bob.com' } });
    setTimeout(() => {
      t.equal(numberOfCalls, 1, 'calls correct number of times');
      cleanup(t);
    }, 2500);
  });
});

test('adds a server method that will process an hook composed of actions', (t) => {
  setup({
    mongo: {
      host: 'mongodb://localhost:27017',
      collectionName: 'hapi-hooks-test'
    },
    interval: 1000, // 1 second
    hooks: {
      'after school': [
        'kickball',
        'trumpet',
        'pottery',
      ]
    }
  }, (cleanup, server, collection) => {
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
    server.methods.hook('after school', {
      name: 'bob',
      age: 7
    });
    setTimeout(() => {
      t.equal(numberOfCalls.kickball, 1);
      t.equal(numberOfCalls.trumpet, 7);
      t.equal(numberOfCalls.pottery, 1);
      collection.findOne({}, (err, hook) => {
        t.equal(hook.status, 'complete');
        t.equal(hook.results.length, 3);
        server.methods.hook('after school', {
          name: 'sven',
          age: 5
        });
        setTimeout(() => {
          t.equal(numberOfCalls.kickball, 2);
          t.equal(numberOfCalls.trumpet, 5);
          t.equal(numberOfCalls.pottery, 2);
          collection.findOne({}, (err, hook2) => {
            t.equal(hook2.status, 'complete');
            t.equal(hook2.results.length, 3);
            cleanup(t);
          });
        }, 2500);
      });
    }, 2500);
  });
});

test('supports foo.bar for methods', (t) => {
  setup({
    mongo: {
      host: 'mongodb://localhost:27017',
      collectionName: 'hapi-hooks-test'
    },
    interval: 100, // 1 second
    hooks: {
      'after school': ['foo.bar']
    }
  }, (cleanup, server) => {
    let numberOfCalls = 0;
    server.method('foo.bar', (data, callback) => {
      numberOfCalls ++;
      callback();
    });
    server.methods.hook('after school', {
      name: 'bob',
      age: 7
    });
    setTimeout(() => {
      t.equal(numberOfCalls, 1);
      cleanup(t);
    }, 2500);
  });
});
test('"decorate" option will register the method with "server.decorate" instead of "server.method"', (t) => {
  setup({
    decorate: true,
    mongo: {
      host: 'mongodb://localhost:27017',
      collectionName: 'hapi-hooks-test'
    },
    interval: 1000, // 1 second
    hooks: {
      'after school': [
        'kickball',
        'trumpet',
        'pottery',
      ]
    }
  }, (cleanup, server) => {
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
    setTimeout(() => {
      t.equal(numberOfCalls.kickball, 1);
      t.equal(numberOfCalls.trumpet, 7);
      t.equal(numberOfCalls.pottery, 1);
      cleanup(t);
    }, 2500);
  });
});
test('can handle and report callback errors during an action', (t) => {
  setup({
    mongo: {
      host: 'mongodb://localhost:27017',
      collectionName: 'hapi-hooks-test'
    },
    interval: 500,
    hooks: {
      'before school': ['breakfast']
    }
  }, (cleanup, server, collection) => {
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
    setTimeout(() => {
      t.equal(numberOfCalls.breakfast, 2);
      // check the db object:
      collection.findOne({}, (err2, hook) => {
        t.equal(hook.status, 'complete');
        t.equal(hook.results.length, 1);
        t.equal(hook.results[0].error, undefined);
        cleanup(t);
      });
    }, 3000);
  });
});

test('can handle and report hook errors during an action', (t) => {
  setup({
    log: true,
    mongo: {
      host: 'mongodb://localhost:27017',
      collectionName: 'hapi-hooks-test'
    },
    interval: 500,
    hooks: {
      'before school': ['breakfast']
    }
  }, (cleanup, server, collection) => {
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
    setTimeout(() => {
      t.equal(numberOfCalls.breakfast, 1);
      cleanup(t);
    }, 3000);
  });
});

test('can handle and report server errors during an action', (t) => {
  setup({
    mongo: {
      host: 'mongodb://localhost:27017',
      collectionName: 'hapi-hooks-test'
    },
    interval: 500,
    hooks: {
      'during school': ['breakfast']
    }
  }, (cleanup, server, collection) => {
    const numberOfCalls = {
      breakfast: 0
    };
    server.method('breakfast', (data, callback) => {
      numberOfCalls.breakfast ++;
      return not.a.thing();
    });
    server.methods.hook('during school', {
      name: 'sven',
      age: 5
    });
    setTimeout(() => {
      t.equal(numberOfCalls.breakfast, 3);
      // check the db object:
      collection.findOne({ hookName: 'during school' }, (err2, hook) => {
        if (err2) {
          throw err2;
        }
        t.equal(hook.status, 'aborted');
        t.equal(hook.results.length, 1);
        // t.equal(hook.results[0].error).to.include('not is not defined');
        cleanup(t);
      });
    }, 3000);
  });
});

test('handles actions passed in a { method s: <method>, data: <data> } form', (t) => {
  let passedData = null;
  setup({
    mongo: {
      host: 'mongodb://localhost:27017',
      collectionName: 'hapi-hooks-test'
    },
    interval: 1000, // 1 second
    hooks: {
      models: [{
        method: 'airplanes',
        data: { data1: 'is data 1' }
      }]
    }
  }, (cleanup, server, collection) => {
    server.method('airplanes', (data, callback) => {
      passedData = data;
      callback(null, passedData);
    });
    server.methods.hook('models', { data2: 'is data 2' });
    setTimeout(() => {
      t.equal(passedData.data1, 'is data 1');
      t.equal(passedData.data2, 'is data 2');
      // you can still over-ride the defaults:
      passedData = null;
      server.methods.hook('models', { data1: 'is data 2' });
      setTimeout(() => {
        t.equal(passedData.data1, 'is data 2');
        cleanup(t);
      }, 2500);
    }, 2500);
  });
});

test('supports the runAfter option', (t) => {
  setup({
    mongo: {
      host: 'mongodb://localhost:27017',
      collectionName: 'hapi-hooks-test'
    },
    interval: 1000, // 1 second
    hooks: {
      'after school': [
        'kickball'
      ]
    }
  }, (cleanup, server, collection, db) => {
    const numberOfCalls = {
      kickball: 0
    };
    server.method('kickball', (data, callback) => {
      numberOfCalls.kickball ++;
      callback(null, numberOfCalls.kickball);
    });
    server.methods.hook('after school', {
      name: 'bob',
      age: 7
    }, {
      runAfter: new Date(new Date().getTime() + 3000)
    });
    setTimeout(() => {
      t.equal(numberOfCalls.kickball, 0);
      setTimeout(() => {
        t.equal(numberOfCalls.kickball, 1);
        cleanup(t);
      }, 2500);
    }, 2500);
  });
});

test('supports the runEvery option', (t) => {
  setup({
    mongo: {
      host: 'mongodb://localhost:27017',
      collectionName: 'hapi-hooks-test'
    },
    interval: 1000,
    hooks: {
      'after school': [
        'kickball'
      ]
    }
  }, (cleanup, server, collection, db) => {
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
      runEvery: 'every 2 second',
      recurringId: 'afterSchool'
    });
    let waitCycles = 0;
    const wait = () => setTimeout(() => {
      waitCycles ++;
      if (waitCycles > 10) {
        t.fail('hook did not recur during allotted time period');
      } else if (numberOfCalls.kickball > 2) {
        cleanup(t);
      } else {
        wait();
      }
    }, 2000);
    wait();
  });
});

test('will not add an hook if it does not exist', (t) => {
  setup({
    mongo: {
      host: 'mongodb://localhost:27017',
      collectionName: 'hapi-hooks-test'
    },
    interval: 1000, // 1 second
    hooks: {} // no hooks
  }, (cleanup, server) => {
    server.methods.hook('perpetual motion', {});
    setTimeout(() => {
      cleanup(t);
    }, 2500);
  });
});
*/
test('will wait to process next batch of hooks until all previous hooks are done', (t) => {
  setup({
    mongo: {
      host: 'mongodb://localhost:27017',
      collectionName: 'hapi-hooks-test'
    },
    log: true,
    interval: 200,
    hooks: {
      'before school': [
        'dodgeball'
      ],
      'after school': [
        'kickball'
      ]
    }
  }, (cleanup, server, collection, db) => {
    let kickball = 0;
    let dodgeball = 0;
    server.method('kickball', (data, callback) => {
      kickball ++;
      callback();
    });
    server.method('dodgeball', (data, callback) => {
      setTimeout(() => {
        dodgeball ++;
        callback();
      }, 2000);
    });
    server.methods.hook('after school', {}, {
      runEvery: 'every 2 second',
      recurringId: 'afterSchool'
    });
    server.methods.hook('before school', {}, {
      runEvery: 'every 2 second',
      recurringId: 'beforeSchool'
    });
    let waitCycles = 0;
    const wait = () => setTimeout(() => {
      waitCycles ++;
      if (waitCycles > 10) {
        t.fail('hook did not recur during allotted time period');
      } else if (dodgeball > 0) {
        t.equal(kickball > 1, true);
        cleanup(t);
      } else {
        wait();
      }
    }, 4000);
    wait();
  });
});

test('retry a hook from id', (t) => {
  let key = 0; // our test hook won't pass while key is zero
  let numberOfCalls = 0;
  async.autoInject({
    startup(done) {
      setup({
        mongo: {
          host: 'mongodb://localhost:27017',
          collectionName: 'hapi-hooks-test'
        },
        interval: 1000,
        hooks: {
          repeat: [
            'repeatableHook()',
          ]
        }
      }, (cleanup, server, collection) => {
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
    result.startup.cleanup(t, process.exit);
  });
});
