'use strict';

const Hapi = require('hapi');
const mongo = require('mongodb');

const hapiHooks = require('../');

const server = new Hapi.Server({
  debug: {
    log: ['example-server', 'hapi-hooks', 'error']
  }
});
server.connection({ port: 8085 });

server.method('demo', (data, cb) => {
  server.log(['example-server'], { method: 'demo', data });
  const name = dat.name;
  cb(null, 'hello');
});

server.method('demo2', (data, cb) => {
  server.log(['example-server'], { method: 'demo2', data });
  cb(null, 'jello');
});

server.register({
  register: hapiHooks,
  options: {
    mongo: {
      host: 'mongodb://localhost:27017',
      collectionName: 'hapihooksdemo'
    },
    interval: 1800,
    hooks: {
      hook1: [
        'demo'
      ],
      hook2: [
        'demo2'
      ]
    }
  }
}, (err) => {
  if (err) {
    server.log(['error'], { message: 'Error registering plugins', err });
    return;
  }
  server.start((err) => {
    console.log(err);  
    server.log(['hapi-hooks'], { message: 'Server Started on 8085' });
  });
});

server.route({
  method: 'GET',
  path: '/',
  handler(req, reply) {
    req.server.methods.hook('hook1', { name: 'George' });
    reply('Hi There');
  }
});

server.route({
  method: 'GET',
  path: '/_hello',
  handler(req, reply) {
    req.server.methods.hook('hook2', { peaches: 'For Sure' });
    reply('Yolo');
  }
});

