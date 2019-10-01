require('dotenv').config();
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const qs = require('querystring');
const signature = require('./verifySignature');
const debug = require('debug')('slash-command-template:index');
const repo = require('./repo')

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

app.post('/mentionRole', (req, res) => {
  // extract the slash command text, and trigger ID from payload
  const { text, trigger_id } = req.body;
  const reqBody = req.body;
  const userId = reqBody.user_id;
  // Verify the signing secret
  if (signature.isVerified(req)) {
    // create the dialog payload - includes the dialog structure, Slack API token,
    // and trigger ID
    const splitText = splitFirstSpace(text);
    var roleName = splitText[0].toLowerCase();
    var message;
    var attachment;
    if(!!repo.roleExists(roleName)){
      var userIdList = repo.getUsersWithRole(roleName);
      var append = !!userIdList ? userIdList.map(userId => "<@" + userId + ">").toString() : "";
      message = `<@${reqBody.user_id}> says:
      ${splitText[1]}\n
      ${append}
      `;
          var blocks = [];
      var headerBlock = {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `<@${reqBody.user_id}> says:`
        }
      };
      blocks.push(headerBlock);
      var messageBlock = {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": splitText[1]
        }
      };
      blocks.push(messageBlock);
      var dividerBlock = {
        "type": "divider"
      }
      blocks.push(dividerBlock);
      var mentionBlock = {
        "type": "context",
        "elements": [
          {
            "type": "mrkdwn",
            "text": append
          }
        ]
      };
      blocks.push(mentionBlock);
      sendMessage(res, reqBody.channel_id, message, blocks, null);
    }
    else{
      res.send("role not found");
      throw "role not found";
    }
  } else {
    debug('Verification token mismatch');
    res.sendStatus(404);
  }
});

app.post('/getRole', (req, res) => {
  // extract the slash command text, and trigger ID from payload
  const { text, trigger_id } = req.body;
  const reqBody = req.body;
  const userId = reqBody.user_id;
  // Verify the signing secret
  if (signature.isVerified(req)) {
    // create the dialog payload - includes the dialog structure, Slack API token,
    // and trigger ID
    var message;
    const splitText = splitFirstSpace(text);
    var roleName = splitText[0].toLowerCase();
    if(!!repo.roleExists(roleName)){
      repo.giveRole(reqBody.user_id, roleName)
      message = `<@${reqBody.user_id}> role ${roleName} successfully added`;
    }
    else{
      message = `<@${reqBody.user_id}> role ${roleName} does not exist`;
    }
    
    getChannelIdForUser(userId, function callback (dmId){
      sendMessage(res, dmId, message, null, null);
    });
  } else {
    debug('Verification token mismatch');
    res.sendStatus(404);
  }
});

app.post('/removeRole', (req, res) => {
  // extract the slash command text, and trigger ID from payload
  const { text, trigger_id } = req.body;
  const reqBody = req.body;
  const userId = reqBody.user_id;
  // Verify the signing secret
  if (signature.isVerified(req)) {
    // create the dialog payload - includes the dialog structure, Slack API token,
    // and trigger ID
    var message;
    const splitText = splitFirstSpace(text);
    var roleName = splitText[0].toLowerCase();

    if(!repo.roleExists(roleName) && repo.getUsersWithRole(roleName).includes(reqBody.user_id)){
      repo.removeRole(reqBody.user_id, roleName)
      message = `<@${reqBody.user_id}> role ${roleName} successfully removed`;
    }
    else{
      message = `<@${reqBody.user_id}> role ${roleName} does not exist`;
    }

    getChannelIdForUser(userId, function callback (dmId){
      sendMessage(res, dmId, message, null, null);
    });
  } else {
    debug('Verification token mismatch');
    res.sendStatus(404);
  }
});

app.post('/myRoles', (req, res) => {
  // extract the slash command text, and trigger ID from payload
  const { text, trigger_id } = req.body;
  const reqBody = req.body;
  const userId = reqBody.user_id;
  if (signature.isVerified(req)) {
      // create the dialog payload - includes the dialog structure, Slack API token,
      // and trigger ID;
    var roles = repo.myRoles(reqBody.user_id);
    var message = `Your roles: ${roles.join(", ")}`;
  
    getChannelIdForUser(userId, function callback (dmId){
      sendMessage(res, dmId, message, null, null);
    });
  } else {
    debug('Verification token mismatch');
    res.sendStatus(404);
  }
});

app.post('/roles', (req, res) => {
  // extract the slash command text, and trigger ID from payload
  const { text, trigger_id } = req.body;
  const reqBody = req.body;
  const userId = reqBody.user_id;
  if (signature.isVerified(req)) {
      // create the dialog payload - includes the dialog structure, Slack API token,
      // and trigger ID;
    var roles = repo.listRoles();
    var message = `Available roles: ${roles.join(", ")}`;
    
    getChannelIdForUser(userId, function callback (dmId){
      sendMessage(res, dmId, message, null, null);
    });
  } else {
    debug('Verification token mismatch');
    res.sendStatus(404);
  }
});


app.post('/addRole', (req, res) => {
  // extract the slash command text, and trigger ID from payload
  const { text, trigger_id } = req.body;
  const reqBody = req.body;
  const userId = reqBody.user_id;
  // Verify the signing secret
  checkAdmin(reqBody.user_id, function callback (isAdmin) {
    if (signature.isVerified(req)) {
      // create the dialog payload - includes the dialog structure, Slack API token,
      // and trigger ID
      var message;
      const splitText = splitFirstSpace(text);
      var roleName = splitText[0].toLowerCase();
      if(isAdmin){
        if(!repo.roleExists(roleName)){
          repo.addRole(roleName);
          message = `<@${reqBody.user_id}> role ${roleName} successfully added`;
        }
        else{
          message = `<@${reqBody.user_id}> role ${roleName} exists`;
        }
      }
      else{
        message = `<@${reqBody.user_id}> please contact eboard to add a role`;
      }
      
    getChannelIdForUser(userId, function callback (dmId){
      sendMessage(res, dmId, message, null, null);
    });
      
    } else {
      debug('Verification token mismatch');
      res.sendStatus(404);
    }
  });
});

app.post('/deleteRole', (req, res) => {
  // extract the slash command text, and trigger ID from payload
  const { text, trigger_id } = req.body;
  const reqBody = req.body;
  const userId = reqBody.user_id;
  // Verify the signing secret
  checkAdmin(reqBody.user_id, function callback (isAdmin) {
    if (signature.isVerified(req)) {
      // create the dialog payload - includes the dialog structure, Slack API token,
      // and trigger ID
      var message;
      const splitText = splitFirstSpace(text);
      var roleName = splitText[0].toLowerCase();
      if(isAdmin){
        if(!!repo.roleExists(roleName)){
          repo.deleteRole(roleName);
          message = `<@${reqBody.user_id}> role ${roleName} successfully deleted`;
        }
        else{
          message = `<@${reqBody.user_id}> role ${roleName} does not exist`;
        }
      }
      else{
        message = `<@${reqBody.user_id}> please contact eboard to delete a role`;
      }

      getChannelIdForUser(userId, function callback (dmId){
        sendMessage(res, dmId, message, null, null);
      });
    } else {
      debug('Verification token mismatch');
      res.sendStatus(404);
    }
  });
});

app.post('/bothelp', (req, res) => {
  // extract the slash command text, and trigger ID from payload
  const { text, trigger_id } = req.body;
  const reqBody = req.body;
  const userId = reqBody.user_id;
  if (signature.isVerified(req)) {
      // create the dialog payload - includes the dialog structure, Slack API token,
      // and trigger ID;
    var message = `Available commands:\n
      /mentionRole {role} {message} - sends a message and mentions all users with that role
      /roles - lists out all available roles
      /myRoles - lists out all of your roles
      /getRole {role} - assign a role to yourself
      /removeRole {role} - removes a role from yourself
      /addRole {role} - adds a new role (admin only)
      /deleteRole {role} - deletes a role (admin only)`;
    getChannelIdForUser(userId, function callback (dmId){    
      sendMessage(res, dmId, message, null, null);
    });
  } else {
    debug('Verification token mismatch');
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
      callback(result.data.user.is_admin || user_id == 'U39Q667C1');
  });
}

function getChannelIdForUser (user_id, callback) {
  axios.get(`https://slack.com/api/im.open`, {
    params: {
      user: user_id,
      token: process.env.SLACK_ACCESS_TOKEN
    }
  })
    .then((result) => {
      callback(result.data.channel.id);
  });
}

function sendMessage (res, channel, text, block, attachments) {
  var tokenStr = process.env.SLACK_ACCESS_TOKEN;
  var message = {
    channel: channel,
    as_user: true,
    text: text
  };
  if(!!block){
    message['blocks'] = block;
  }
  if(!!attachments){
    message['attachments'] = attachments;
  }
  axios.post('https://slack.com/api/chat.postMessage', message, { headers: {"Authorization" : `Bearer ${tokenStr}`} }).then((result) => {
    debug('sendConfirmation: %o', result.data);
    res.send('');
    console.log(result)
  }).catch((err) => {
    debug('sendConfirmation error: %o', err);
    console.error(err);
  });
}