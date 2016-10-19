'use strict';
const mongo = require('mongodb');
const async = require('async');
const automap = require('automap');

const defaults = {
  mongo: {
    host: 'mongodb://localhost:27017',
    collectionName: 'hapi-activities'
  },
  timeout: 30 * 1000, // max time an action can take, default is 30 secs, set to false for infinity
  interval: 5 * 60 * 1000, // 5 minutes
  log: false
};

exports.register = (server, options, next) => {
  const settings = Object.assign({}, defaults, options);
  // connect to db:
  mongo.connect(settings.mongo.host, (err, db) => {
    if (err) {
      return next(err);
    }
    // initialize the server object:
    const collection = db.collection(settings.mongo.collectionName);

    // update all activities:
    const updateActivities = (allDone) => {
      automap(
        // fetch all 'waiting' activities
        (done) => {
          collection
          .find({ status: 'waiting' })
          .toArray((dbErr, results) => {
            if (dbErr) {
              return allDone(dbErr);
            }
            // can go back to sleep if nothing was found:
            if (results.length === 0) {
              return allDone();
            }
            done(null, results);
          });
        },
        // for each activity we just fetched, do the following process:
        (activity) => {
          return {
            // log that it's underway:
            logActivity: (done) => {
              collection.update({ _id: activity._id }, { $set: { status: 'processing' } }, (err) => {
                if (err) {
                  server.log(['hapi-activities', 'error'], err);
                }
                if (settings.log) {
                  server.log(['hapi-activities', 'starting-activity', 'debug'], { message: 'Processing underway for activity', data: activity });
                }
                done();
              });
            },
            // execute the actions in parallel:
            performActions: ['logActivity', (results, done) => {
              // will launch the activity's actions in parallel:
              const updatedActivity = {
                results: []
              };
              async.each(settings.activities[activity.activityName], (action, eachDone) => {
                let actionData = activity.activityData;
                // merge any default parameters for this action:
                if (typeof action === 'object') {
                  actionData = Object.assign(action.data, actionData);
                  action = action.method;
                }
                // if a timeout is specified then put a timeout wrapper around the server method call:
                const actionCall = settings.timeout ? async.timeout(server.methods[action], settings.timeout) : server.methods[action];
                // now make the call:
                try {
                  actionCall(actionData, (error, output) => {
                    // will log async's ETIMEDOUT error, as well as other errors for this action:
                    if (error) {
                      updatedActivity.results.push({ action, error });
                      updatedActivity.status = 'failed';
                    } else {
                      updatedActivity.results.push({ action, output });
                    }
                    return eachDone();
                  });
                } catch (e) {
                  updatedActivity.results.push({ action, error: `${e.name} ${e.message} ` });
                  updatedActivity.status = 'failed';
                  eachDone();
                }
              }, () => {
                // when we have the results from all actions, we're ready to update the activity:
                done(null, updatedActivity);
              });
            }],
            // update the activity with the results of processing the actions:
            completeActivity: ['performActions', (previous, done) => {
              const updatedActivity = {
                results: previous.performActions.results,
                // if any of the actions 'failed' then the activity status is 'failed':
                status: (previous.performActions.status === 'failed') ? 'failed' : 'complete',
                completedOn: new Date()
              };
              collection.update({ _id: activity._id }, { $set: updatedActivity }, done);
            }]
          };
        },
      allDone);
    };

    // register the 'activity' method with the server:
    server.method('activity', (activityName, activityData) => {
      // verify that this activity exists:
      if (!settings.activities[activityName]) {
        return;
      }
      collection.insertOne({
        activityName,
        activityData,
        status: 'waiting',
        added: new Date()
      }, (insertErr) => {
        if (insertErr) {
          server.log(['hapi-activities', 'error'], insertErr);
        }
        if (settings.log) {
          server.log(['hapi-activities', 'new-activity', 'debug'], { message: `Registering a new activity: '${activityName}'`, data: activityData });
        }
      });
    });

    // keep processing activities until the server.stop method is called
    let continueProcessing = true;
    server.ext({
      type: 'onPreStop',
      method: (request, done) => {
        continueProcessing = false;
        done();
      }
    });
    const timer = () => {
      if (!continueProcessing) {
        return;
      }
      updateActivities((err) => {
        if (err) {
          server.log(['hapi-activities', 'error'], err);
        }
        if (continueProcessing) {
          setTimeout(timer, settings.interval);
        }
      });
    };
    timer();

    // now tell hapi that we're done registering the plugin!
    next();
  });
};

exports.register.attributes = {
  pkg: require('./package.json')
};
