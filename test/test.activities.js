'use strict';
const code = require('code');   // assertion library
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const Hapi = require('hapi');
const mongo = require('mongodb');

let server;
let db;
let collection;
let hapiActivities;

lab.experiment('hapi-activities', () => {
  lab.beforeEach((done) => {
    mongo.connect('mongodb://localhost:27017', (err, theDb) => {
      if (err) {
        console.log(err);
      }
      db = theDb;
      collection = db.collection('hapi-activities-test');
      collection.drop( () => {
        hapiActivities = require('../');
        server = new Hapi.Server({
          debug: {
            log: ['hapi-activities', 'error']
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

  lab.test('adds a server method that will process an activity composed of actions', { timeout: 10000 }, (done) => {
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
      register: hapiActivities,
      options: {
        mongo: {
          host: 'mongodb://localhost:27017',
          collectionName: 'hapi-activities-test'
        },
        interval: 1000, // 1 second
        activities: {
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
      server.methods.activity('after school', {
        name: 'bob',
        age: 7
      });
      setTimeout(() => {
        code.expect(numberOfCalls.kickball).to.equal(1);
        code.expect(numberOfCalls.trumpet).to.equal(7);
        code.expect(numberOfCalls.pottery).to.equal(1);
        collection.findOne({}, (err, activity) => {
          code.expect(activity.status).to.equal('complete');
          code.expect(activity.results.length).to.equal(3);
          server.methods.activity('after school', {
            name: 'sven',
            age: 5
          });
          setTimeout(() => {
            code.expect(numberOfCalls.kickball).to.equal(2);
            code.expect(numberOfCalls.trumpet).to.equal(5);
            code.expect(numberOfCalls.pottery).to.equal(2);
            collection.findOne({}, (err, activity2) => {
              code.expect(activity2.status).to.equal('complete');
              code.expect(activity2.results.length).to.equal(3);
              done();
            });
          }, 2500);
        });
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
      register: hapiActivities,
      options: {
        mongo: {
          host: 'mongodb://localhost:27017',
          collectionName: 'hapi-activities-test'
        },
        interval: 500,
        activities: {
          'before school': ['breakfast']
        }
      }
    }, (err) => {
      server.methods.activity('before school', {
        name: 'sven',
        age: 5
      });
      setTimeout(() => {
        code.expect(numberOfCalls.breakfast).to.equal(1);
        // check the db object:
        collection.findOne({}, (err, activity) => {
          code.expect(activity.status).to.equal('failed');
          code.expect(activity.results.length).to.equal(1);
          code.expect(activity.results[0].error).to.equal('I am an error');
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
      register: hapiActivities,
      options: {
        mongo: {
          host: 'mongodb://localhost:27017',
          collectionName: 'hapi-activities-test'
        },
        interval: 1000, // 1 second
        activities: {
          'models': [{
            method: 'airplanes',
            data: { data1: 'is data 1'}
          }]
        }
      }
    }, (err) => {
      if (err) {
        console.log(err);
      }
      server.methods.activity('models', { data2: 'is data 2' });
      setTimeout(() => {
        code.expect(passedData.data1).to.equal('is data 1');
        code.expect(passedData.data2).to.equal('is data 2');
        // you can still over-ride the defaults:
        passedData = null;
        server.methods.activity('models', { data1: 'is data 2' });
        setTimeout(() => {
          code.expect(passedData.data1).to.equal('is data 2');
          done();
        }, 2500);
      }, 2500);
    });
  });
});
