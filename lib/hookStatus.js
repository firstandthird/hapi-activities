'use strict';
const async = require('async');

module.exports = (collection, lastIntervalDate, allDone) => {
  const current = {
    processing: 0,
    waiting: 0,
    complete: 0
  };
  async.each(['processing', 'waiting', 'complete', 'failed', 'aborted'], (status, eachDone) => {
    const query = { status };
    // only get count for tasks completed since last interval was called:
    if (status === 'complete' && lastIntervalDate) {
      query.completedOn = { $gt: lastIntervalDate };
    }
    collection.count(query).then((count) => {
      current[status] = count;
      eachDone();
    });
  }, (err, result) => {
    /* istanbul ignore if */
    if (err) {
      return allDone(err);
    }
    return allDone(null, current);
  });
};
