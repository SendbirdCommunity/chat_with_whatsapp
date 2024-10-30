const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const app = express();

/**
 * Middleware to capture raw body for Slack signature verification.
 */
app.use(express.json({ verify: (req, _, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true, verify: (req, _, buf) => { req.rawBody = buf; } }));




app.post("/messages",  async (req, res) => {
    console.log("POSTED HERE")
    console.log(req.body)
    const changes = req.body.entry
    changes.forEach(entry => {
      console.log(entry.changes)
    })
    res.sendStatus(200); // Acknowledge the event immediately

});

const VERIFY_TOKEN = "mySecureVerifyToken123!";  // Replace with your custom token

app.get("/messages", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token === VERIFY_TOKEN) {
        // Token verified successfully, return challenge back to WhatsApp
        res.status(200).send(challenge);
    } else {
        // Token verification failed
        res.sendStatus(403);
    }
});

/**
 * Starts the server on a specified port.
 */
app.listen(3000, () => console.log("Server started on port 3000"));
