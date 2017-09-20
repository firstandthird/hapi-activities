'use strict';
const Hapi = require('hapi');
const mongo = require('mongodb');
const async = require('async');
const hapiHooks = require('../');

module.exports = (options, callback) => {
  async.autoInject({
    db(done) {
      mongo.connect('mongodb://localhost:27017', done);
    },
    collection(db, done) {
      done(null, db.collection('hapi-hooks-test'));
    },
    drop(collection, db, done) {
      collection.drop(() => done());
    },
    server(drop, done) {
      const server = new Hapi.Server({
        debug: {
          log: ['hapi-hooks', 'error']
        }
      });
      server.connection({ port: 8080 });
      done(null, server);
    },
    register(server, done) {
      server.register({
        register: hapiHooks,
        options
      }, done);
    }
  }, (err, results) => {
    if (err) {
      throw err;
    }

    const cleanup = (test, endMethod) => {
      async.autoInject({
        drop(done) {
          results.collection.drop(() => done());
        },
        stop(done) {
          results.server.stop({ timeout: 250 }, done);
        },
        close(stop, drop, done) {
          results.db.close(true, done);
        },
        end(close, done) {
          test.end();
          done();
        },
        endMethod(end, done) {
          if (endMethod) {
            endMethod();
          }
          done();
        }
      }, (err2) => {
        if (err) {
          throw err2;
        }
      });
    };

    callback(results.server, results.collection, results.db, cleanup);
  });
};
