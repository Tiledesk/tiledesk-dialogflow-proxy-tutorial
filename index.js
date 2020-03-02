const express = require('express');
const bodyParser = require('body-parser');
const { TiledeskClient } = require('@tiledesk/tiledesk-chatbot-client');
const dialogflow = require('dialogflow');
const app = express();
app.use(bodyParser.json());

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
  const responses = await sessionClient.detectIntent(request);
  const result = responses[0].queryResult;
  return result;
}

app.post("/bot", (req, res) => {
  const tdclient = new TiledeskClient({request: req, response: res});
  let conversation = tdclient.conversation
  // immediately reply back
  res.status(200).send({"success":true});
  // reply messages are sent asynchronously
  const dialogflow_session_id = conversation.request_id
  const lang = 'en-EN'
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS)
  runDialogflowQuery(tdclient.text, dialogflow_session_id, lang, credentials)
  .then(function(result) {
    console.log("query result: ", JSON.stringify(result))
    console.log("is fallback:", result.intent.isFallback)
    console.log("confidence:", result.intentDetectionConfidence)
    // intentDetectionConfidence
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
    console.log('Error: ', err);
  })
})

var port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('server started');
});