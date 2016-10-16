'use strict';
const code = require('code');   // assertion library
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const Hapi = require('hapi');
const hapiActivities = require('../');

lab.experiment('hapi-auto-handler', () => {
  let server;
  lab.beforeEach((done) => {
    server = new Hapi.Server({
      debug: {
        log: ['hapi-activities']
      }
    });
    server.connection({ port: 8080 });
    done();
  });

  lab.afterEach((done) => {
    server.stop(() => {
      done();
    });
  });

  lab.test('lets you set up a list of activities', { timeout: 10000 }, (done) => {
    const numberOfCalls = {
      kickball: 0,
      trumpet: 0,
      pottery: 0
    };
    server.method('kickball', () => {
      numberOfCalls.kickball ++;
    });
    server.method('trumpet', (data) => {
      numberOfCalls.trumpet = data.age;
    });
    server.method('pottery', () => {
      numberOfCalls.pottery ++;
    });
    server.register({
      register: hapiActivities,
      options: {
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
        done();
      }, 5000);
    });
  });
});
