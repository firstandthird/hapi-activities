'use strict';
const Hapi = require('hapi');
const mongo = require('mongodb');

module.exports = (options, callback) => {
  let server;
  let db;
  let collection;
  let hapiHooks;
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
      server.register({
        register: hapiHooks,
        options
      }, (err) => {
        return callback((t, endMethod) => {
          collection.drop(() => {
            server.stop(() => {
              t.end();
              if (endMethod) {
                endMethod();
              }
            });
          });
        }, server, collection, db);
      });
    });
  });
};
