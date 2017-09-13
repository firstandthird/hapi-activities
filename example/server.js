'use strict';

const Hapi = require('hapi');
const hapiHooks = require('../');
const server = new Hapi.Server();

server.connection({ port: 8080 });

server.route({
  method: 'GET',
  path: '/',
  handler(req, reply) {
    reply('Hi There');
  }
});

server.method('playSoftball', (data, next) => {
  console.log('Play Ball!'); // eslint-disable-line no-console
  next(null);
});

server.register({
  register: hapiHooks,
  options: {
    hooks: {
      'after:school': [
        'playSoftball'
      ]
    },
    recurring: {
      doAfterSchool: {
        hook: 'after:school',
        schedule: 'every 3 minutes'
      }
    }
  }
}, (err) => {
  if (err) {
    throw err;
  }
  server.start(startErr => {
    if (startErr) {
      throw startErr;
    }
    console.log(`Server running at: ${server.info.uri}`); // eslint-disable-line no-console
  });
});
