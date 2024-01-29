const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const crypto = require('crypto');

// Initialize Express application
const app = express();

app.use(express.urlencoded({ extended: true }));

// Middleware to access the raw body
const rawBodyBuffer = (req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || "utf8");
  }
};


const verifySlackRequest = (req) => {
  const slackSignature = req.headers['x-slack-signature'];
  const requestTimestamp = req.headers['x-slack-request-timestamp'];

  // Protect against replay attacks by verifying the request timestamp is within five minutes of the current time
  const timeDiff = Math.abs(Date.now() / 1000 - requestTimestamp);
  if (timeDiff > 60 * 5) {
    return false;
  }

  const sigBasestring = `v0:${requestTimestamp}:${req.rawBody}`;
  const mySignature = 'v0=' + 
    crypto.createHmac('sha256', process.env.SLACK_SIGNING_SECRET)
      .update(sigBasestring, 'utf8')
      .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(mySignature, 'utf8'), Buffer.from(slackSignature, 'utf8'));
};


// Use the middleware
app.use(bodyParser.urlencoded({ verify: rawBodyBuffer, extended: true }));

// Define POST endpoint for creating a lead
app.post("/message_to_bot", async (req, res) => {
  
  if (!verifySlackRequest(req)) {
    return res.status(400).send('Verification failed');
  }

  // Proceed with processing the request
  // Your logic here

  res.status(200).send('Request verified');
});

// Start the server on port 3000
app.listen(3000, () => console.log("Server started on port 3000"));
