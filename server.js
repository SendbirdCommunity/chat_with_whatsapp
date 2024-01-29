const express = require("express");
const axios = require("axios");
const crypto = require("crypto");

// Initialize Express application
const app = express();

app.use(express.json({verify: (req, _, buf) => {req.rawBody = buf;}}));
app.use(express.urlencoded({extended: true,verify: (req, _, buf) => {req.rawBody = buf}}));

function secureCompare(a, b) {
    try {
        return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
    } catch (error) {
        return false;
    }
}


const slack = (req, res, next) => {
  
    //Adapted from - https://dev.to/soumyadey/verifying-requests-from-slack-the-correct-method-for-nodejs-417i
    //Based on https://api.slack.com/authentication/verifying-requests-from-slack
    const timestampHeader = req.headers['x-slack-request-timestamp'];
    if (!timestampHeader) {
        return res.status(400).send('Error: Missing Slack timestamp header.');
    }

    const currentTime = Math.floor(new Date().getTime() / 1000);
    if (Math.abs(currentTime - Number(timestampHeader)) > 300) {
        return res.status(400).send('Error: Request too old.');
    }

    const baseString = `v0:${timestampHeader}:${req.rawBody}`;
    const receivedSignature = req.headers['x-slack-signature'];
    const hmac = crypto.createHmac('sha256', process.env.SLACK_SIGNING_SECRET);
    const expectedSignature = `v0=${hmac.update(baseString, 'utf8').digest('hex')}`;

    if (!secureCompare(expectedSignature, receivedSignature)) {
        console.log('WEBHOOK SIGNATURE MISMATCH');
        return res.status(400).send('Error: Signature mismatch security error');
    }

    console.log('WEBHOOK VERIFIED');
    next();
  
}

// Define POST endpoint for creating a lead
app.post("/message_to_bot",slack,  async (req, res) => {

  // Proceed with processing the request
  // Your logic here
  const { text, user_name } =  req.body
  console.log(text)
  console.log(user_name)

  res.status(200).send(JSON.stringify(req.body));
});

// Start the server on port 3000
app.listen(3000, () => console.log("Server started on port 3000"));
