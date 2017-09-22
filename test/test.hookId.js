// const setup = require('./setup.js');
// const tap = require('tap');
// const async = require('async');
// 
// tap.test('supports hookId', (t) => {
//   setup({
//     mongo: {
//       host: 'mongodb://localhost:27017/hooks',
//       collectionName: 'hapi-hooks-test'
//     },
//     log: false,
//     interval: 2000,
//     hooks: {
//       'after school': [
//         'kickball'
//       ]
//     }
//   }, (server, collection, db, cleanup) => {
//     let cycles = 0;
//     let semaphore = 0;
//     server.method('kickball', (data, callback) => {
//       callback();
//     });
//     server.on('hook:start', () => {
//       console.log('')
//       semaphore++;
//       // exit if its run enough times:
//       if (cycles === 5) {
//         console.log('exit')
//         return cleanup(t);
//       }
//       cycles++;
//       // launch another afterSchool hook as soon as this starts:
//       server.methods.hook('after school', {
//         name: 'bob',
//         age: 7
//       }, {
//         hookId: 'afterSchool'
//       });
//       t.equal(semaphore, 0, 'start is never called until previous hook completed');
//     });
//     server.on('hook:complete', () => {
//       semaphore--;
//       if (cycles > 5) {
//         return;
//       }
//       t.equal(semaphore, 1, 'start is never called without after');
//       cycles++;
//     });
//     server.methods.hook('after school', {
//       name: 'bob',
//       age: 7
//     }, {
//       hookId: 'afterSchool'
//     });
//   });
// });
