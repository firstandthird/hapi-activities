# hapi-activities

An 'activity' is a process that is added to a server by a server event, but which happens independently of that event. A separate process polls for new activities and handles processing and updating them. Requires access to a mongo server to track activities.

*__Use cases__*:
- adding users or updating lists
- sending emails
- metrics
- aggregate counts
- long running processes
- notification systems


```
install hapi-activities
```

Example (where ```server``` is your initialized hapi server):

```js
server.method('addUserObject', (data, callback) => {
  ABunchODBStuff(data, (err, result) => {
    if (!err) {
      console.log("added the user object!");
    }
    return callback(err, result);
  });
});
server.method('sendEmail', (data, callback) => {
  console.log("emailing an email to %s", data.email);
  sendSomeEmail(data.email, callback);
});

server.method('bigLongCalculation', (data) => {
  console.log("calculating the widget number");
  return callback(null, performBigLongCalculation(data.widgetNumber));
});

server.register({
  register: require('hapi-activities'),
  options: {
    interval: 30000, // checks for new activities to process every 3 seconds
    activities: {
      'create user': [
        // actions can just be the name of the server method to invoke:
        'addUserObject',
        // actions can also be given default params:
        {
            method: 'sendEmail',
            data: { smtpHost: 'http://www.smtp.com', smtpLogin: 'myLogin', smtpPassword: 'insecure1'}
        }
        {
          method: 'bigLongCalculation',
          data: { x: 42 }
        }
      ]
    }
  }
}, () => {
  server.methods.activity('create user', {
    email: 'superuser@example.com',
    widgetNumber: 152
  });
});
```

Output may not appear until up to 3 seconds after the call to ```server.methods.activity```, it will look something like:
```sh
emailing an email to superuser@example.com
added the user object
calculating the widget number
```

Note that the server methods within an activity call are invoked in parallel, so the above example outputs could be printed in any order.  
