'use strict';
const setup = require('./setup.js');
const test = require('tape');

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
      numberOfCalls.breakfast ++;
      return callback('I am an error');
    });
    server.methods.hook('before school', {
      name: 'sven',
      age: 5
    });
    setTimeout(() => {
      t.equal(numberOfCalls.breakfast, 1);
      // check the db object:
      collection.findOne({}, (err2, hook) => {
        t.equal(hook.status, 'failed');
        t.equal(hook.results.length, 1);
        t.equal(hook.results[0].error, 'I am an error');
        cleanup(t);
      });
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
      t.equal(numberOfCalls.breakfast, 1);
      // check the db object:
      collection.findOne({ hookName: 'during school' }, (err2, hook) => {
        if (err2) {
          throw err2;
        }
        t.equal(hook.status, 'failed');
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
      cleanup(t, process.exit);
    }, 2500);
  });
});
