const express = require('express');
const bodyParser = require('body-parser');
const { TiledeskClient } = require('@tiledesk/tiledesk-chatbot-client');
const dialogflow = require('dialogflow');

const app = express();
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Hello Tiledesk-Dialogflow proxy!')
});

async function runDialogflowQuery(text, sessionId, language_code, credentials) {

  const project_id = credentials.project_id
  const sessionClient = new dialogflow.SessionsClient({'credentials':credentials});
  const sessionPath = sessionClient.sessionPath(project_id, sessionId);
  
  var request;
  request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: text,
        languageCode: language_code,
      }
    }
  };
  // Send request and log result
  const responses = await sessionClient.detectIntent(request);
  const result = responses[0].queryResult;
  return result;
}

app.post("/bot", (req, res) => {
  console.log("BOT: req.body: " + JSON.stringify(req.body));
  
  const tdclient = new TiledeskClient({request: req, response: res});

  let conversation = tdclient.conversation

  // immediately reply back
  res.status(200).send({"success":true});

  const dialogflow_session_id = conversation.request_id
  const lang = 'en-EN'
  const credentials = process.env.GOOGLE_CREDENTIALS
  console.log("CREDENTIALS:", credentials)
  runDialogflowQuery(tdclient.text, dialogflow_session_id, lang, credentials)
  .then(function(result) {
    if(res.statusCode === 200) {
      const reply_text = result['fulfillmentText']
      var msg_attributes = {}
      var msg = {
        "text": reply_text,
        "type": "text",
        "senderFullname": tdclient.botName
      }
      tdclient.sendMessage(msg, function (err) {
        console.log("Message sent.");
      })
    }
  })
  .catch(function(err) {
    console.log('BOT: error: ', err);
  })
})

app.listen(3000, () => {
  console.log('server started');
});