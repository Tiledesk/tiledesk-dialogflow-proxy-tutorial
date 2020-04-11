const express = require('express');
const bodyParser = require('body-parser');
const { TiledeskClient } = require('@tiledesk/tiledesk-chatbot-client');
const { TiledeskChatbotUtil } = require('@tiledesk/tiledesk-chatbot-util')
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

app.post("/bot/:botid", (req, res) => {
  const tdclient = new TiledeskClient({request: req, response: res});
  const botid = req.params.botid;
  const conversation = tdclient.conversation
  // immediately reply back
  res.status(200).send({"success":true});
  // reply messages are sent asynchronously
  const dialogflow_session_id = conversation.request_id
  const lang = 'en-EN' // lang must be the same of the Dialogflow Agent
  const credentials = JSON.parse(process.env[botid])
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

app.post("/microlang-bot/:botid", (req, res) => {
  const tdclient = new TiledeskClient({request: req, response: res});
  const botid = req.params.botid;
  console.log("botid:", botid)
  const conversation = tdclient.conversation
  // immediately reply back
  res.status(200).send({"success":true});
  // reply messages are sent asynchronously
  const dialogflow_session_id = conversation.request_id
  const lang = 'en-EN' // lang must be the same of the Dialogflow Agent
  console.log("loading credentials...") //, process.env[botid])
  const credentials = JSON.parse(process.env[botid])
  runDialogflowQuery(tdclient.text, dialogflow_session_id, lang, credentials)
  .then(function(result) {
    console.log("query result: ", JSON.stringify(result))
    console.log("is fallback:", result.intent.isFallback)
    console.log("confidence:", result.intentDetectionConfidence)
    // intentDetectionConfidence
    if(res.statusCode === 200) {
      const reply_text = result['fulfillmentText']
      const parsed_reply = new TiledeskChatbotUtil().parseReply(reply_text)
      const msg = parsed_reply.message
      // NOTE: you can also use parts of the parsed message, like this
      // var msg = {
      //   "text": parsed_message.text,
      //   "type": parsed_message.type,
      //   "attributes": msg_attributes,
      //   "metadata": parsed_message.metadata,
      //   "senderFullname": tdclient.botName
      // }
      tdclient.sendMessage(msg, function (err) {
        console.log("Message sent.");
      })
    }
  })
  .catch(function(err) {
    console.log('Error: ', err);
  })
})

var fallback_count = {}

app.post("/bot-confidence-handoff/:botid", (req, res) => {
  const tdclient = new TiledeskClient({request: req, response: res});
  const botid = req.params.botid;
  const conversation = tdclient.conversation
  // immediately reply back
  res.status(200).send({"success":true});
  // reply messages are sent asynchronously
  const dialogflow_session_id = conversation.request_id
  const lang = 'en-EN' // lang must be the same of the Dialogflow Agent
  const credentials = JSON.parse(process.env[botid])
  runDialogflowQuery(tdclient.text, dialogflow_session_id, lang, credentials)
  .then(function(result) {
    console.log("query result: ", JSON.stringify(result))
    console.log("is fallback:", result.intent.isFallback)
    if (result.intent.isFallback) {
      if (!fallback_count[dialogflow_session_id]) {
        fallback_count[dialogflow_session_id] = 1
      }
      else {
        fallback_count[dialogflow_session_id]++
      }
    }
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