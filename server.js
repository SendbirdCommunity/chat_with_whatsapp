const express = require("express");
const axios = require("axios");
const crypto = require("crypto");

// Initialize Express application
const app = express();

app.use(express.urlencoded({ extended: true }));

// Middleware to access the raw body
const rawBodyBuffer = (req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || "utf8");
  }
};

const verifySlackRequest = (req, res, next) => {
  
  try {
    const slackSignature = req.headers["x-slack-signature"];
    const requestTimestamp = Number(req.headers['x-slack-request-timestamp']);
    console.log(slackSignature)
    console.log(requestTimestamp)

  // Protect against replay attacks by verifying the request timestamp is within five minutes of the current time
  const timeDiff = Math.abs(Date.now() / 1000 - requestTimestamp);
   
  if (timeDiff > 60 * 5) {
    return res.status(400).send("Request timestamp is too old.");
  }

  // console.log(req.rawBody); // Make sure req.rawBody is populated as expected

  const sigBasestring = `v0:${requestTimestamp}:${req.body}`;
  const mySignature = "v0=" + crypto.createHmac("sha256", process.env.SLACK_SIGNING_SECRET)
                                   .update(sigBasestring, "utf8")
                                   .digest("hex");

  const slackSignatureBuf = Buffer.from(slackSignature, "utf8");
  const mySignatureBuf = Buffer.from(mySignature, "utf8");

  // Ensure both buffers are the same length
  if (slackSignatureBuf.length !== mySignatureBuf.length) {
    return res.status(400).send("Signature length mismatch.");
  }

  if (crypto.timingSafeEqual(mySignatureBuf, slackSignatureBuf)) {
    console.log("working")
    next(); // Verification succeeded, proceed to the next middleware/route handler
  } else {
    res.status(403).send("Verification failed."); // Verification failed, end the response
  }
  } catch (e) {
    console.log(e)
  }

};


// Define POST endpoint for creating a lead
app.post("/message_to_bot", verifySlackRequest, async (req, res) => {

  // Proceed with processing the request
  // Your logic here

  res.status(200).send("Request verified");
});

// Start the server on port 3000
app.listen(3000, () => console.log("Server started on port 3000"));
