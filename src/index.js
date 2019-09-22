require('dotenv').config();
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const qs = require('querystring');
const ticket = require('./ticket');
const signature = require('./verifySignature');
const debug = require('debug')('slash-command-template:index');
const repo = require('./repo')

const apiUrl = 'https://slack.com/api';

const app = express();
/*
 * Parse application/x-www-form-urlencoded && application/json
 * Use body-parser's `verify` callback to export a parsed raw body
 * that you need to use to verify the signature
 */

const rawBodyBuffer = (req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
};

app.use(bodyParser.urlencoded({verify: rawBodyBuffer, extended: true }));
app.use(bodyParser.json({ verify: rawBodyBuffer }));

app.get('/', (req, res) => {
  res.send('<h2>The Slash Command and Dialog app is running</h2> <p>Follow the' +
  ' instructions in the README to configure the Slack App and your environment variables.</p>');
});

/*
 * Endpoint to receive /helpdesk slash command from Slack.
 * Checks verification token and opens a dialog to capture more info.
 */
app.post('/command', (req, res) => {
  // extract the slash command text, and trigger ID from payload
  const { text, trigger_id } = req.body;
  // Verify the signing secret
  console.log(req.body);
  if (signature.isVerified(req)) {
    // create the dialog payload - includes the dialog structure, Slack API token,
    // and trigger ID
    const dialog = {
      token: process.env.SLACK_ACCESS_TOKEN,
      trigger_id,
      dialog: JSON.stringify({
        title: 'Submit a helpdesk ticket',
        callback_id: 'submit-ticket',
        submit_label: 'Submit',
        elements: [
          {
            label: 'Title',
            type: 'text',
            name: 'title',
            value: text,
            hint: '30 second summary of the problem',
          },
          {
            label: 'Description',
            type: 'textarea',
            name: 'description',
            optional: true,
          },
          {
            label: 'Urgency',
            type: 'select',
            name: 'urgency',
            options: [
              { label: 'Low', value: 'Low' },
              { label: 'Medium', value: 'Medium' },
              { label: 'High', value: 'High' },
            ],
          },
        ],
      }),
    };

    // open the dialog by calling dialogs.open method and sending the payload
    axios.post(`${apiUrl}/dialog.open`, qs.stringify(dialog))
      .then((result) => {
        debug('dialog.open: %o', result.data);
        res.send('');
      }).catch((err) => {
        debug('dialog.open call failed: %o', err);
        res.sendStatus(500);
      });
  } else {
    debug('Verification token mismatch');
    res.sendStatus(404);
  }
});

app.post('/mentionRole', (req, res) => {
  // extract the slash command text, and trigger ID from payload
  const { text, trigger_id } = req.body;
  const reqBody = req.body;
  // Verify the signing secret
  if (signature.isVerified(req)) {
    // create the dialog payload - includes the dialog structure, Slack API token,
    // and trigger ID
    const splitText = splitFirstSpace(text);
    var message;
    var attachment;
    if(!!repo.checkRole(splitText[0])){
      var userIdList = repo.getUsersWithRole(splitText[0]);
      var append = !!userIdList ? userIdList.map(userId => "<@" + userId + ">").toString() : "";
      console.log(append);
      message = `<@${reqBody.user_id}> says:\n\n${splitText[1]}`;
      attachment = JSON.stringify([
        {
          title: `@${splitText[0]}`,
          text: append
        },
      ]);
    }
    else{
      res.send("role not found");
    } 
    axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
      token: process.env.SLACK_ACCESS_TOKEN,
      channel: reqBody.channel_id,
      as_user: true,
      text: message,
      attachments: attachment
    })).then((result) => {
      debug('sendConfirmation: %o', result.data);
      res.send('');
    }).catch((err) => {
      debug('sendConfirmation error: %o', err);
      console.error(err);
    });
  } else {
    debug('Verification token mismatch');
    res.sendStatus(404);
  }
});

app.post('/getRole', (req, res) => {
  // extract the slash command text, and trigger ID from payload
  const { text, trigger_id } = req.body;
  const reqBody = req.body;
  // Verify the signing secret
  checkAdmin(reqBody.user_id, function callback (isAdmin) {
    if (signature.isVerified(req)) {
      // create the dialog payload - includes the dialog structure, Slack API token,
      // and trigger ID
      var message;
      const splitText = splitFirstSpace(text);
      
      if(!!repo.checkRole(splitText[0])){
        repo.giveRole(reqBody.user_id, splitText[0])
        message = `<@${reqBody.user_id}> role ${splitText[0]} successfully added`;
      }
      else{
        message = `<@${reqBody.user_id}> role ${splitText[0]} exists`;
      }

      axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
        token: process.env.SLACK_ACCESS_TOKEN,
        channel: reqBody.user_id,
        as_user: true,
        text: message
      })).then((result) => {
        debug('sendConfirmation: %o', result.data);
        res.send('');
      }).catch((err) => {
        debug('sendConfirmation error: %o', err);
        console.error(err);
      });
    } else {
      debug('Verification token mismatch');
      res.sendStatus(404);
    }
  });
});

app.post('/addRole', (req, res) => {
  // extract the slash command text, and trigger ID from payload
  const { text, trigger_id } = req.body;
  const reqBody = req.body;
  // Verify the signing secret
  checkAdmin(reqBody.user_id, function callback (isAdmin) {
    if (signature.isVerified(req)) {
      // create the dialog payload - includes the dialog structure, Slack API token,
      // and trigger ID
      var message;
      const splitText = splitFirstSpace(text);
      if(isAdmin){
        if(!!repo.checkRole(splitText[0])){
          repo.addRole(splitText[0]);
          message = `<@${reqBody.user_id}> role ${splitText[0]} successfully added`;
        }
        else{
          message = `<@${reqBody.user_id}> role ${splitText[0]} exists`;
        }
      }
      else{
        message = `<@${reqBody.user_id}> please contact eboard to add a role`;
      }

      axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
        token: process.env.SLACK_ACCESS_TOKEN,
        channel: reqBody.channel_id,
        as_user: true,
        text: message
      })).then((result) => {
        debug('sendConfirmation: %o', result.data);
        res.send('');
      }).catch((err) => {
        debug('sendConfirmation error: %o', err);
        console.error(err);
      });
    } else {
      debug('Verification token mismatch');
      res.sendStatus(404);
    }
  });
});

app.post('/roles',async (req, res) => {
  // extract the slash command text, and trigger ID from payload
  const { text, trigger_id } = req.body;
  const reqBody = req.body;
  if (signature.isVerified(req)) {
      // create the dialog payload - includes the dialog structure, Slack API token,
      // and trigger ID;
    var roles = repo.listRoles();
    axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
      token: process.env.SLACK_ACCESS_TOKEN,
      channel: reqBody.user_id,
      as_user: true,
      text: `Available roles: ${roles.join(", ")}`
    })).then((result) => {
      debug('sendConfirmation: %o', result.data);
      res.send('');
    }).catch((err) => {
      debug('sendConfirmation error: %o', err);
      console.error(err);
    });
  } else {
    debug('Verification token mismatch');
    res.sendStatus(404);
  }
});

/*
 * Endpoint to receive the dialog submission. Checks the verification token
 * and creates a Helpdesk ticket
 */
app.post('/interactive', (req, res) => {
  const body = JSON.parse(req.body.payload);

  // check that the verification token matches expected value
  if (signature.isVerified(req)) {
    debug(`Form submission received: ${body.submission.trigger_id}`);

    // immediately respond with a empty 200 response to let
    // Slack know the command was received
    res.send('');

    // create Helpdesk ticket
    ticket.create(body.user.id, body.submission);
  } else {
    debug('Token mismatch');
    res.sendStatus(404);
  }
});

const server = app.listen(process.env.PORT || 5000, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});

function splitFirstSpace (str) {
  var left = str.substr(0,str.indexOf(' '));
  var right = str.substr(str.indexOf(' ')+1);
  if(!left){
    return [right, left];
  }
  else{
    return [left, right];
  }
}

function checkAdmin (user_id, callback) {
  axios.get(`https://slack.com/api/users.info`, {
    params: {
      user: user_id,
      token: process.env.SLACK_ACCESS_TOKEN
    }
  })
    .then((result) => {
      callback(result.data.user.is_admin);
  });
}