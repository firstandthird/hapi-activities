'use strict';
const async = require('async');

const current = {
  processing: 0,
  waiting: 0,
  completed: 0
};

module.exports = (server, settings, collection, allDone) => {
  async.eachSeries(['processing', 'waiting', 'completed'], (status, eachDone) => {
    collection.count({ status }).then((count) => {
      current[status] = count;
      eachDone();
    });
  }, (err, result) => {
    if (err) {
      return allDone(err);
    }
    return allDone(null, current);
  });
};
