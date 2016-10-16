const mongo = require('mongodb');
const async = require('async');
const _ = require('lodash');

const defaults = {
  mongo: {
    host: 'mongodb://localhost:27017',
    collectionName: 'hapi-activities'
  },
  interval: 5 * 60 * 1000, // 5 minutes
  log: true
};

exports.register = (server, options, next) => {
  const settings = _.defaults(options, defaults);
  mongo.connect(settings.mongo.host, (err, db) => {
    if (err) {
      return next(err);
    }
    // initialize the server object:
    const collection = db.collection(settings.mongo.collectionName);

    // update activities based on a specific server activityName:
    const updateActivities = (activityName, allDone) => {
      async.auto({
        // 1. fetch all open activities from db:
        collection: (done) => {
          collection
          .find({ status: 'waiting', activityName })
          .toArray(done);
        },
        // 2. mark them as underway:
        markProcessing: ['collection', (results, saveDone) => {
          async.each(results.collection, (activity, done) => {
            if (settings.log) {
              server.log(['hapi-activities', 'starting-activity', 'debug'], activity);
            }
            activity.status = 'processing';
            collection.update({ _id: activity._id }, activity, done);
          }, saveDone);
        }],
        // 3. process them:
        process: ['markProcessing', (results, done) => {
          async.eachSeries(results.collection, (activity, seriesDone) => {
            // execute all actions in parallel:
            if (settings.log) {
              server.log(['hapi-activities', 'executing-activity', 'debug'], activity);
            }
            async.each(settings.activities[activity.activityName], (action, eachDone) => {
              eachDone(server.methods[action](activity.activityData));
            }, seriesDone);
          }, done);
        }],
        // 4. mark them as complete:
        markComplete: ['process', (results, saveDone) => {
          async.each(results.collection, (activity, done) => {
            if (settings.log) {
              server.log(['hapi-activities', 'finished-activity', 'debug'], activity);
            }
            activity.status = 'complete';
            collection.update({ _id: activity._id }, activity, done);
          }, saveDone);
        }]
      }, (autoErr) => {
        if (autoErr) {
          server.log(autoErr);
        }
        allDone();
      });
    };

    // register the 'activity' method with the server:
    server.method('activity', (activityName, activityData) => {
      if (settings.log) {
        server.log(['hapi-activities', 'new-activity', 'debug'], activityData);
      }
      collection.insertOne({
        activityName,
        activityData,
        status: 'waiting',
        added: new Date()
      }, (insertErr) => {
        if (insertErr) {
          server.log(insertErr);
        }
      });
    });

    // manage the interval polling:
    const timer = () => {
      async.each(Object.keys(settings.activities), (activityName, done) => {
        updateActivities(activityName, done);
      }, (timerErr) => {
        if (timerErr) {
          server.log(timerErr);
        }
        setTimeout(timer, settings.interval);
      });
    };
    timer();
    next();
  });
};

exports.register.attributes = {
  pkg: require('./package.json')
};
