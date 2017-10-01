'use strict';
const async = require('async');

module.exports = (collection, lastIntervalDate, allDone) => {
  const current = {
    processing: 0,
    waiting: 0,
    complete: 0,
    hanged: []
  };
  async.autoInject({
    // cleanup any hanged processes:
    hanged(done) {
      // any older than 5 minutes get restarted
      collection.find({ status: 'processing', startedOn: { $gt: new Date(new Date().getTime() - (1000 * 60 * 60 * 5)) } }).toArray(done);
    },
    cleanup(hanged, done) {
      current.hanged = hanged;
      done();
    },
    outstanding(cleanup, done) {
      // check for outstanding:
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
      }, done);
    }
  }, (err, result) => {
    /* istanbul ignore if */
    if (err) {
      return allDone(err);
    }
    return allDone(null, current);
  });
};
