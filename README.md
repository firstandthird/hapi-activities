# hapi-activities

An 'activity' is a process that is added to a server by a server event, but which happens independently of that event. A separate process polls for new activities and handles processing and updating them.  

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
server.method('addUserObject', (data) => {
  ABunchODBStuff(data);
  console.log("added the user object");
});
server.method('sendEmail', (data) => {
  sendSomeEmail(data.email);
  console.log("emailed the email to %s", data.email);
});
server.method('bigLongCalculation', (data) => {
  performBigLongCalculation(data.widgetNumber);
  console.log("calculated the widget number")
});

server.register({
  register: require('hapi-activities'),
  options: {
    interval: 30000, // checks for new activities to process every 3 seconds
    activities: {
      'create user': [
        'bigLongCalculation',
        'addUserObject',
        'sendEmail'
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
emailed the email to superuser@example.com
added the user object
calculated the widget number
```

Note that the server methods within an activity call are invoked in parallel, so the above example outputs could be printed in any order.  
