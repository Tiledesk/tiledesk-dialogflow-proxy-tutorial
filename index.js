const express = require('express');
const bodyParser = require('body-parser');
const { TiledeskChatbotClient } = require('@tiledesk/tiledesk-chatbot-client');
const { TiledeskChatbotUtil } = require('@tiledesk/tiledesk-chatbot-util')
const { TiledeskClient } = require('@tiledesk/tiledesk-client');
const dialogflow = require('dialogflow');
const app = express();
app.use(bodyParser.json());

// this function is referenced by all the tutorials and uses
// Dialogflow client APIs to make agents calls
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

// Tutorial 1 - Basic Dialogflow extarnal endpoint
app.post("/bot/:botid", (req, res) => {
  // for cloud apis initialize like the this:
  const tdclient = new TiledeskChatbotClient({request: req})
  // for on-prem installations specify your endpoint like this:
  // const tdclient = new TiledeskChatbotClient({request: req, APIURL: 'YOUR API ENDPOINT'});
  const botid = req.params.botid;
  const conversation = tdclient.supportRequest
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
      var msg = {
        "text": reply_text
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

// Tutorial 2 - Advanced tutorial using 'micro language' to render buttons or images
app.post("/microlang-bot/:botid", (req, res) => {
  const tdclient = new TiledeskChatbotClient({request: req});
  const botid = req.params.botid;
  console.log("botid:", botid)
  const conversation = tdclient.supportRequest
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
        console.log("Message", msg, "sent.");
      })
    }
  })
  .catch(function(err) {
    console.log('Error: ', err);
  })
})

// Tutorial 3 - Automatic human handhoff based on fallback intent
// In this tutorial the human handoff happens after some consective
// missed replies (fallback)
var consecutive_fallback_count = {};
const MAX_FALLBACKS = 4;
app.post("/bot-fallback-handoff/:botid", (req, res) => {
  const tdclient = new TiledeskChatbotClient(
    {request: req,
     APIURL: 'https://tiledesk-server-pre.herokuapp.com'
    });
  console.log("tdclient", tdclient)
  const botid = req.params.botid;
  const supportRequest = tdclient.supportRequest
  // immediately reply back
  res.status(200).send({"success":true});
  // reply messages are sent asynchronously
  const dialogflow_session_id = supportRequest.request_id
  const lang = 'en-EN' // lang must be the same of the Dialogflow Agent
  const credentials = JSON.parse(process.env[botid])
  runDialogflowQuery(tdclient.text, dialogflow_session_id, lang, credentials)
  .then(function(result) {
    if (!consecutive_fallback_count[dialogflow_session_id]) {
      // init consecutive fallback count for this conversation
      consecutive_fallback_count[dialogflow_session_id] = 0
    }
    if (result.intent.isFallback) {
      consecutive_fallback_count[dialogflow_session_id]++
      console.log("fallback of", dialogflow_session_id, "is", consecutive_fallback_count[dialogflow_session_id])
    }
    else {
      // reset fallback on every positive hit.
      // here you can also evaluate result.intentDetectionConfidence
      // and consider it as a fallback if under some threshold value
      consecutive_fallback_count[dialogflow_session_id] = 0
    }
    if(res.statusCode === 200) {
      let msgs = [];
      if (consecutive_fallback_count[dialogflow_session_id] == MAX_FALLBACKS) {
        consecutive_fallback_count[dialogflow_session_id] = 0
        msgs.push({
          "text": "I really don't understand your questions, putting you in touch with an operator..."
        })
        msgs.push({
          "text": "\\agent",
          "attributes" : {subtype: "info"} // this message is hidden in the widget
        })
      }
      else {
        msgs.push({
          "text": result['fulfillmentText']
        })
      }
      msgs.forEach( m => {
        tdclient.sendMessage(m, function (err) {
          console.log("Message", m.text, "sent.");
        })
      })
    }
  })
  .catch(function(err) {
    console.log('Error: ', err);
  })
})

// Tutorial 4 - Ask user for optional Agent handoff

// Tutorial 4.1 - Webhook for Bot-Agent handoff message based on opening hours
app.post('/dfwebhook/:project_id', (req, res) => {
  // console.log("req.body: " , req.body)
  const fulfillmentText = req.body.queryResult.fulfillmentText
  console.log("fulfillmentText:", fulfillmentText)
  const languageCode = req.body.queryResult.languageCode
  console.log("languageCode:", languageCode)
  // replace the following with your prject id
  const project_id = req.params.project_id
  const intent = req.body.queryResult.intent.displayName.toUpperCase()
  if (intent === "TALK TO AGENT") {
    // for cloud apis initialize like the this:
    // const tdclient = new TiledeskClient()
    // for on premises installations specify your endpoint like this:
    const tdclient = new TiledeskClient({APIURL: 'https://tiledesk-server-pre.herokuapp.com'})
    tdclient.anonymauth(project_id, function(token) {
      tdclient.openNow(project_id, token, function(isopen) {
        var df_res = {}
        if (isopen) {
          df_res['fulfillmentText'] = "We are open! Switching to agent\\agent"
        }
        else {
          df_res['fulfillmentText'] = "I'm sorry but we are closed right now."
        }
        res.status(200).send(JSON.stringify(df_res));
      })
    })
  }
});

var port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('server started');
});