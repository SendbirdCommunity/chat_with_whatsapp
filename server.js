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







function performFurtherActions(payload) {
    // Simulate some asynchronous work, like fetching data or processing information
    setTimeout(async () => {
        try {
            const responseUrl = payload.response_url;

            // Prepare the additional details you want to send
            const message = {
                response_type: 'in_channel', // or 'ephemeral' for a private message
                text: '🤖A: Here are the additional details you requested...'
                // You can also include more complex attachments or blocks here
            };

            // POST the message to the response_url
            await axios.post(responseUrl, message);

            console.log('Additional details sent successfully');
        } catch (error) {
            console.error('Failed to send additional details:', error);
        }
    }, 5000); // Delay of 5 seconds for demonstration purposes
  
     let data = JSON.stringify({
        "messages": [
            {"role": "user", "content": "Hi"},
            {"role": "assistant", "content": "Hi, how can I help you?"},
            {"role": "user", "content": "Tell me about Sendbird."}
        ]
    });

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://api-B0A89C0D-9C76-4AC4-A694-595E76C2A1D0.sendbird.com/v3/bots/banana_savvy/ai_chatbot_replies',
        headers: {
            'Api-Token': 'ab319a91ffba6781145c6732c541e92acfb8179f',
            'Content-Type': 'application/json'
        },
        data: data
    };

    try {
        const response = await axios.request(config);
        console.log(JSON.stringify(response.data));
    } catch (error) {
        console.error(error);
    }
  
  
}

// Define POST endpoint for creating a lead
app.post("/message_to_bot",slack,  async (req, res) => {

  // Proceed with processing the request
  // Your logic here
  const payload = req.body;

  const { text, user_name } =  req.body
  console.log(text)
  console.log(user_name)

  res.json({
        response_type: 'in_channel', // or 'ephemeral' for a private message
        text: `\n\n🤖 \nQ: ${text}`
    });
  
  
  // res.status(200).send(text);
  performFurtherActions(payload);
});

// Start the server on port 3000
app.listen(3000, () => console.log("Server started on port 3000"));
