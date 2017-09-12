'use strict';
const async = require('async');

module.exports = (collection, lastIntervalDate, allDone) => {
  const current = {
    processing: 0,
    waiting: 0,
    completed: 0
  };
  async.each(['processing', 'waiting', 'completed', 'failed', 'aborted'], (status, eachDone) => {
    const query = { status };
    // only get tasks completed since last interval was called:
    if (status === 'completed' && lastIntervalDate) {
      query.completedOn = { $gt: lastIntervalDate };
    }
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
