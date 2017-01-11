'use strict';
const code = require('code');   // assertion library
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const Hapi = require('hapi');
const mongo = require('mongodb');

let server;
let db;
let collection;
let hapiHooks;

lab.experiment('hapi-hooks', () => {
  lab.beforeEach((done) => {
    mongo.connect('mongodb://localhost:27017', (err, theDb) => {
      if (err) {
        throw err;
      }
      db = theDb;
      collection = db.collection('hapi-hooks-test');
      collection.drop(() => {
        hapiHooks = require('../');
        server = new Hapi.Server({
          debug: {
            log: ['hapi-hooks', 'error']
          }
        });
        server.connection({ port: 8080 });
        done();
      });
    });
  });

  lab.afterEach((done) => {
    server.stop(done);
  });

  lab.test('adds a server method that will process an hook composed of actions', { timeout: 10000 }, (done) => {
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
    server.register({
      register: hapiHooks,
      options: {
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
      }
    }, (err) => {
      if (err) {
        console.log(err);
      }
      server.methods.hook('after school', {
        name: 'bob',
        age: 7
      });
      setTimeout(() => {
        code.expect(numberOfCalls.kickball).to.equal(1);
        code.expect(numberOfCalls.trumpet).to.equal(7);
        code.expect(numberOfCalls.pottery).to.equal(1);
        collection.findOne({}, (err, hook) => {
          code.expect(hook.status).to.equal('complete');
          code.expect(hook.results.length).to.equal(3);
          server.methods.hook('after school', {
            name: 'sven',
            age: 5
          });
          setTimeout(() => {
            code.expect(numberOfCalls.kickball).to.equal(2);
            code.expect(numberOfCalls.trumpet).to.equal(5);
            code.expect(numberOfCalls.pottery).to.equal(2);
            collection.findOne({}, (err, hook2) => {
              code.expect(hook2.status).to.equal('complete');
              code.expect(hook2.results.length).to.equal(3);
              done();
            });
          }, 2500);
        });
      }, 2500);
    });
  });

  lab.test('supports foo.bar for methods', { timeout: 5000 }, (done) => {
    let numberOfCalls = 0;
    server.method('foo.bar', (data, callback) => {
      numberOfCalls ++;
      callback();
    });
    server.register({
      register: hapiHooks,
      options: {
        mongo: {
          host: 'mongodb://localhost:27017',
          collectionName: 'hapi-hooks-test'
        },
        interval: 100, // 1 second
        hooks: {
          'after school': ['foo.bar']
        }
      }
    }, () => {
      server.methods.hook('after school', {
        name: 'bob',
        age: 7
      });
      setTimeout(() => {
        code.expect(numberOfCalls).to.equal(1);
        done();
      }, 2500);
    });
  });

  lab.test('"decorate" option will register the method with "server.decorate" instead of "server.method"', { timeout: 7000 }, (done) => {
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
    server.register({
      register: hapiHooks,
      options: {
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
      }
    }, (err) => {
      if (err) {
        throw err;
      }
      server.hook('after school', {
        name: 'bob',
        age: 7
      });
      setTimeout(() => {
        code.expect(numberOfCalls.kickball).to.equal(1);
        code.expect(numberOfCalls.trumpet).to.equal(7);
        code.expect(numberOfCalls.pottery).to.equal(1);
        done();
      }, 2500);
    });
  });

  lab.test('can handle and report callback errors during an action', { timeout: 8000 }, (done) => {
    const numberOfCalls = {
      breakfast: 0
    };
    server.method('breakfast', (data, callback) => {
      numberOfCalls.breakfast ++;
      return callback('I am an error');
    });
    server.register({
      register: hapiHooks,
      options: {
        mongo: {
          host: 'mongodb://localhost:27017',
          collectionName: 'hapi-hooks-test'
        },
        interval: 500,
        hooks: {
          'before school': ['breakfast']
        }
      }
    }, (err) => {
      if (err) {
        throw err;
      }
      server.methods.hook('before school', {
        name: 'sven',
        age: 5
      });
      setTimeout(() => {
        code.expect(numberOfCalls.breakfast).to.equal(1);
        // check the db object:
        collection.findOne({}, (err2, hook) => {
          code.expect(hook.status).to.equal('failed');
          code.expect(hook.results.length).to.equal(1);
          code.expect(hook.results[0].error).to.equal('I am an error');
          done();
        });
      }, 3000);
    });
  });

  lab.test('can handle and report server errors thrown asynchronously ', { timeout: 12000 }, (done) => {
    const numberOfCalls = {
      breakfast: 0
    };
    server.method('breakfast', (data, callback) => {
      numberOfCalls.breakfast ++;
      // make sure error is thrown after try/catch block: ?
      setTimeout(() => {
        return not.a.thing();
      }, 500);
    });
    server.register({
      register: hapiHooks,
      options: {
        mongo: {
          host: 'mongodb://localhost:27017',
          collectionName: 'hapi-hooks-test'
        },
        interval: 500,
        hooks: {
          'during school': ['breakfast']
        }
      }
    }, (err) => {
      if (err) {
        throw err;
      }
      server.methods.hook('during school', {
        name: 'sven',
        age: 5
      });
      setTimeout(() => {
        code.expect(numberOfCalls.breakfast).to.equal(1);
        // check the db object:
        collection.findOne({ hookName: 'during school' }, (err2, hook) => {
          if (err2) {
            throw err2;
          }
          code.expect(hook.status).to.equal('failed');
          code.expect(hook.results.length).to.equal(1);
          code.expect(hook.results[0].error).to.include('not is not defined');
          done();
        });
      }, 3000);
    });
  });

  lab.test('can handle and report server errors during an action', { timeout: 12000 }, (done) => {
    const numberOfCalls = {
      breakfast: 0
    };
    server.method('breakfast', (data, callback) => {
      numberOfCalls.breakfast ++;
      return not.a.thing();
    });
    server.register({
      register: hapiHooks,
      options: {
        mongo: {
          host: 'mongodb://localhost:27017',
          collectionName: 'hapi-hooks-test'
        },
        interval: 500,
        hooks: {
          'during school': ['breakfast']
        }
      }
    }, (err) => {
      if (err) {
        throw err;
      }
      server.methods.hook('during school', {
        name: 'sven',
        age: 5
      });
      setTimeout(() => {
        code.expect(numberOfCalls.breakfast).to.equal(1);
        // check the db object:
        collection.findOne({ hookName: 'during school' }, (err2, hook) => {
          if (err2) {
            throw err2;
          }
          code.expect(hook.status).to.equal('failed');
          code.expect(hook.results.length).to.equal(1);
          code.expect(hook.results[0].error).to.include('not is not defined');
          done();
        });
      }, 3000);
    });
  });

  lab.test('handles actions passed in a { method s: <method>, data: <data> } form', { timeout: 10000 }, (done) => {
    let passedData = null;
    server.method('airplanes', (data, callback) => {
      passedData = data;
      callback(null, passedData);
    });
    server.register({
      register: hapiHooks,
      options: {
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
      }
    }, (err) => {
      if (err) {
        throw err;
      }
      server.methods.hook('models', { data2: 'is data 2' });
      setTimeout(() => {
        code.expect(passedData.data1).to.equal('is data 1');
        code.expect(passedData.data2).to.equal('is data 2');
        // you can still over-ride the defaults:
        passedData = null;
        server.methods.hook('models', { data1: 'is data 2' });
        setTimeout(() => {
          code.expect(passedData.data1).to.equal('is data 2');
          done();
        }, 2500);
      }, 2500);
    });
  });

  lab.test('will not add an hook if it does not exist', { timeout: 10000 }, (done) => {
    server.register({
      register: hapiHooks,
      options: {
        mongo: {
          host: 'mongodb://localhost:27017',
          collectionName: 'hapi-hooks-test'
        },
        interval: 1000, // 1 second
        hooks: {} // no hooks
      }
    }, (err) => {
      if (err) {
        throw err;
      }
      server.methods.hook('perpetual motion', {});
      setTimeout(() => {
        done();
      }, 2500);
    });
  });

});
