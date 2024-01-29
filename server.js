const express = require("express");
const axios = require("axios");
const crypto = require("crypto");

// Initialize Express application
const app = express();

app.use(express.urlencoded({ extended: true }));

// Middleware to access the raw body


const verifySlackRequest = (req, res, next) => {
  
  
    const slackSignature = req.headers["x-slack-signature"];
    const requestTimestamp = Number(req.headers['x-slack-request-timestamp']);
    console.log(slackSignature)
    console.log(requestTimestamp)

  // console.log(req.rawBody); // Make sure req.rawBody is populated as expected

  const sigBasestring = `v0:${requestTimestamp}:${req.body}`;
  console.log(sigBasestring)
  const mySignature = "v0=" + crypto.createHmac("sha256", process.env.SLACK_SIGNING_SECRET)
                                   .update(sigBasestring, "utf8")
                                   .digest("hex");



};


// Define POST endpoint for creating a lead
app.post("/message_to_bot", express.text({type: ''}), async (req, res) => {

  // Proceed with processing the request
  // Your logic here

  res.status(200).send("Request verified");
});

// Start the server on port 3000
app.listen(3000, () => console.log("Server started on port 3000"));
