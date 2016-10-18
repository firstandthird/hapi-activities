const mongo = require('mongodb');
const async = require('async');
const _ = require('lodash');

exports.register = (server, options, next) => {
  const defaults = {
    mongo: {
      host: 'mongodb://localhost:27017',
      collectionName: 'hapi-activities'
    },
    timeout: 30 * 1000, // max time an action can take, default is 30 secs, set to false for infinity
    interval: 5 * 60 * 1000, // 5 minutes
    log: true
  };
  const settings = _.defaults(options, defaults);
  // connect to db:
  mongo.connect(settings.mongo.host, (err, db) => {
    if (err) {
      return next(err);
    }
    // initialize the server object:
    const collection = db.collection(settings.mongo.collectionName);

    // update all activities:
    const updateActivities = (allDone) => {
      // automap this for clarity:

      async.auto({
        // 1. fetch all open activities from db:
        collection: (done) => {
          collection
          .find({ status: 'waiting' })
          .toArray(done);
        },
        // 2. mark them as underway:
        markProcessing: ['collection', (results, saveDone) => {
          if (!results.collection || results.collection.length === 0) {
            return saveDone();
          }
          const ids = [];
          results.collection.forEach((item) => {
            if (settings.log) {
              server.log(['hapi-activities', 'starting-activity', 'debug'], { message: 'Processing underway for item', data: item });
            }
            ids.push(item._id);
          });
          collection.update({ _id: { $in: ids } }, { $set: { status: 'processing' } }, { multi: true }, saveDone);
        }],
        // 3. for each activity, launch its actions in parallel and let each action's callback handler report back:
        process: ['markProcessing', (results, done) => {
          async.eachSeries(results.collection, (activity, seriesDone) => {
            const updatedActivity = {
              results: []
            };
            // will launch actions in parallel:
            async.each(settings.activities[activity.activityName], (action, eachDone) => {
              if (settings.log) {
                server.log(['hapi-activities', 'executing-action', 'debug'], { message: `Executing activity ${activity.activityName} action ${action}`, data: activity.activityData });
              }
              // if a timeout is specified then put a timeout wrapper around the server method call:
              const actionCall = settings.timeout ? async.timeout(server.methods[action], settings.timeout) : server.methods[action];
              actionCall(activity.activityData, (error, output) => {
                if (settings.log) {
                  server.log(['hapi-activities', 'finished-action', 'debug'], { message: `Finished executing activity ${activity._id} action ${action}`, data: output });
                }
                // will handle async's ETIMEDOUT error as well as other errors:
                if (error) {
                  updatedActivity.results.push({ action, error });
                  updatedActivity.status = 'failed';
                } else {
                  updatedActivity.results.push({ action, output });
                }
                eachDone();
              });
            }, () => {
              // once all actions are in, we can update the whole activity:
              updatedActivity.status = (updatedActivity.status === 'failed') ? 'failed' : 'complete';
              updatedActivity.completedOn = new Date();
              collection.update({ _id: activity._id }, { $set: updatedActivity }, (err) => {
                seriesDone();
              });
            });
          });
          return done();
        }],
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
        server.log(['hapi-activities', 'new-activity', 'debug'], { message: `Registering a new activity: '${activityName}'`, data: activityData });
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
      updateActivities(() => {
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
