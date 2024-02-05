const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const app = express();

/**
 * Middleware to capture raw body for Slack signature verification.
 */
app.use(express.json({ verify: (req, _, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true, verify: (req, _, buf) => { req.rawBody = buf; } }));

/**
 * Performs a timing-safe comparison between two strings.
 * @param {string} a - The first string to compare.
 * @param {string} b - The second string to compare.
 * @returns {boolean} - Returns true if the strings are equal, false otherwise.
 */
const secureCompare = (a, b) => crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));

/**
 * Middleware to authenticate incoming Slack calls by verifying their signature.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function in the stack.
 */
const authenticateIncomingSlackCalls = (req, res, next) => {
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

/**
 * Performs further actions after Slack call authentication, such as making an API request.
 * @param {Object} payload - The payload received from Slack.
 */
const passMessageToSendbirdBot = async (payload) => {
  console.log("working 1")
  
    try {
        // const response = await axios.post(`https://api-${process.env.SENDBIRD_APP_ID}.sendbird.com/v3/bots/banana_savvy/ai_chatbot_replies`, {
        //     messages: [
        //       { role: 'user', content: payload.text }
        //     ]
        // }, {
        //     headers: { 'Api-Token': process.env.SENDBIRD_API_TOKEN, 'Content-Type': 'application/json' },
        //     maxBodyLength: Infinity
        // });

//       {
//   token: 'FkCzxzrvz4bvrVbxLYy7bTW0',
//   team_id: 'T0ADCTNEL',
//   team_domain: 'sendbird',
//   channel_id: 'DF4F43S6P',
//   channel_name: 'directmessage',
//   user_id: 'UF60L0086',
//   user_name: 'jason.allshorn',
//   command: '/ask',
//   text: 'there?',
//   api_app_id: 'A06G2D6NPQC',
//   is_enterprise_install: 'false',
//   response_url: 'https://hooks.slack.com/commands/T0ADCTNEL/6576201349062/2WP00PqRoPF3LSVaN8Tc9b2y',
//   trigger_id: '6595492611985.10454940496.5a87a1b5b608cc1cf1ed793eb93b956f'
// }
      
        // const message = { response_type: 'in_channel', text: `${response.data.reply_messages[0]}` };
        // await axios.post(payload.response_url, message);
      const body = {
        channel: payload.channel_id,
        text: "working"
      }
      const result = await axios.post("https://slack.com/api/chat.postMessage", body)
      console.log("working 2", result)
    } catch (error) {
        console.error('Error in performFurtherActions:', error);
    }
};

/**
 * Route to handle messages sent to the bot. Authenticates the request and responds accordingly.
 */
app.post('/message_to_bot', authenticateIncomingSlackCalls, async (req, res) => {
    // const { text } = req.body;
    // res.sendStatus(200)
    // // res.json({ response_type: 'in_channel', text: `🤖\n Thinking...` });
    passMessageToSendbirdBot(req.body);
});

/**
 * Starts the server on a specified port.
 */
app.listen(3000, () => console.log('Server started on port 3000'));
