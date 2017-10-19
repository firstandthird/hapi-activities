# hapi-hooks

A 'hook' is a task that is spawned by a server event, but is performed independently of that event. This frees up the server to respond to requests and do other important work, while an independent process polls for new hooks and handles processing and updating them. This module requires access to a mongo server that is used to track the hooks.

*__Use cases__*:
- adding users or updating lists
- sending emails
- metrics
- aggregate counts
- long running processes
- notification systems

```
install hapi-hooks
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
  register: require('hapi-hooks'),
  options: {
    interval: 30000, // checks for new hooks to process every 3 seconds
    hooks: {
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
  server.methods.hook('create user', {
    email: 'superuser@example.com',
    widgetNumber: 152
  });
});
```

Output may not appear until up to 3 seconds after the call to ```server.methods.hook```, it will look something like:
```sh
emailing an email to superuser@example.com
added the user object
calculating the widget number
```

Note that the server methods within an hook call are invoked in parallel, so the above example outputs could be printed in any order.

### Recurring Support

Pass the following options:

`runEvery` - A laterjs supported string, ex: `at 5pm sunday`
`hookId` - A unique identifier. Used to prevent duplicate hooks (Recommended for all hooks)
