const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const app = express();

/**
 * Middleware to capture raw body for Slack signature verification.
 */
app.use(express.json({ verify: (req, _, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true, verify: (req, _, buf) => { req.rawBody = buf; } }));

/**
 * Performs a timing-safe comparison between two strings.
 */
const secureCompare = (a, b) => crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));

/**
 * Middleware to authenticate incoming Slack calls by verifying their signature.
 */
const authenticateIncomingSlackCalls = (req, res, next) => {
    console.log("auth hit")
    const timestamp = req.headers['x-slack-request-timestamp'];
    if (!timestamp || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
        return res.status(400).send('Error: Invalid request.');
    }

    const sigBaseString = `v0:${timestamp}:${req.rawBody}`;
    const receivedSig = req.headers['x-slack-signature'];
    const hmac = crypto.createHmac('sha256', process.env.SLACK_SIGNING_SECRET).update(sigBaseString, 'utf8').digest('hex');
    if (!secureCompare(`v0=${hmac}`, receivedSig)) {
        return res.status(400).send('Error: Signature mismatch.');
    }

    next();
};

const fetchPreviousSlackMessages = async (channelId) => {
  const headers = {
    Authorization: `Bearer ${process.env.SLACK_AUTH_TOKEN}`,
    "Content-Type": "application/json; charset=utf-8",
  };
  return axios.post(
    "https://slack.com/api/conversations.history",
    { channel: channelId, limit: 10 },
    { headers }
  );
};

//Function that gets last 10 message from Slack.
const formatConversation = (messages) => {
  return messages.data.messages.reverse().map((message) => ({
    content: message.text,
    role: message.bot_profile ? "assistant" : "user",
  }));
};

const askSendbirdAIBot = async (messages) => {
  const headers = {
    "Api-Token": process.env.SENDBIRD_API_TOKEN,
    "Content-Type": "application/json",
  };
  const response = await axios.post(
    `https://api-${process.env.SENDBIRD_APP_ID}.sendbird.com/v3/bots/${process.env.SENDBIRD_BOT_ID}/ai_chatbot_replies`,
    { messages },
    { headers }
  );
  return response.data.reply_messages[0];
};

// Post message back to Slack
const postMessageToSlack = async (channelId, botsReply) => {
  let message = { channel: channelId, text: botsReply };
  const headers = {
    Authorization: `Bearer ${process.env.SLACK_AUTH_TOKEN}`, // Use your actual Slack token
    "Content-Type": "application/json; charset=utf-8",
  };
  return await axios.post("https://slack.com/api/chat.postMessage", message, {
    headers,
  });
};

// Process message events
const handleSlackWebhookEvent = async (req) => {
  
  const { type, subtype, bot_id, channel } = req.body.event;
  console.log(type)
  if (type === "message" && !subtype && bot_id === undefined) {
    const previousSlackMessages = await fetchPreviousSlackMessages(channel);

    const formattedConversation = formatConversation(previousSlackMessages);
    const response = await askSendbirdAIBot(formattedConversation);
    const result = await postMessageToSlack(channel, response);
    console.log(result)
  } else {
    console.log(type)
  }
};

// Respond to Slack challenge for URL verification
const handleSlackChallenge = (req, res) => {

  if (req.body.challenge) {
    res.status(200).send(req.body.challenge);
    return true; // Indicate that the challenge was handled
  }
  return false; // Indicate that there was no challenge to handle
};

app.post("/messages", authenticateIncomingSlackCalls, async (req, res) => {
  if (!handleSlackChallenge(req, res)) {
    res.sendStatus(200); // Acknowledge the event immediately
    await handleSlackWebhookEvent(req); // Process the event asynchronously
  }
});

/**
 * Starts the server on a specified port.
 */
app.listen(3000, () => console.log("Server started on port 3000"));
