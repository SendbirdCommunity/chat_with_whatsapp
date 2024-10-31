const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const app = express();

// Middleware to capture raw body for signature verification.
app.use(express.json({ verify: (req, _, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true, verify: (req, _, buf) => { req.rawBody = buf; } }));

const VERIFY_TOKEN = "mySecureVerifyToken123!"; // Replace with your custom token

// Webhook endpoint for receiving messages
app.post("/messages", async (req, res) => {
    console.log("POSTED HERE");
    parseWebhookData(req.body.entry);  // Call the function to parse data
    res.sendStatus(200); // Acknowledge the event immediately
});

// Verification for GET requests
app.get("/messages", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token === VERIFY_TOKEN) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

/**
 * Extracts the chat code from the message text.
 * @param {string} inputString - The input message body text.
 * @returns {Object|null} Parsed JSON object if the code is valid, otherwise null.
 */
function extractChatCode(inputString) {
    const match = inputString.match(/code:(.+)/);
    const result = match ? match[1].trim() : null;
    try {
        return JSON.parse(result);
    } catch (e) {
        console.log("Error parsing chat code:", e);
        return null;
    }
}

/**
 * Parses incoming webhook data and processes each entry.
 * @param {Array} entries - List of entries from the webhook payload.
 */
async function parseWebhookData(entries) {
    entries.forEach(async (entry) => {
        entry.changes.forEach(async (change) => {
            console.log("Field:", change.field);

            // Extract properties from the change object
            const messagingProduct = change.value.messaging_product;
            const metadata = change.value.metadata;
            const contacts = change.value.contacts;
            const messages = change.value.messages;

            console.log("Messaging Product:", messagingProduct);
            console.log("Metadata:", metadata);

            // Process contacts and messages if they are arrays
            contacts.forEach(contact => console.log("Contact:", contact));

            for (const message of messages) {
                if (message.type === 'text') {
                    await handleTextMessage(message);
                }
            }
        });
    });
}

/**
 * Handles a text message by extracting chat code, managing Sendbird channels and users.
 * @param {Object} message - The message object.
 */
async function handleTextMessage(message) {
    const code = extractChatCode(message.text.body);

    if (code) {
        console.log("Starting new conversation with code:", code);
        const merchantId = code.merchant;
        const product = code.product;
        const userId = message.from;

        // Check if a channel exists between merchant and user
        let channelExists = await checkExistingChannel(merchantId, userId);

        // If no channel, ensure user exists and create a channel if necessary
        if (!channelExists) {
            const userExists = await checkUserExistsOnSendbird(userId);
            if (!userExists) await createUserOnSendbird(userId);
            // Placeholder for creating channel
            console.log(`Creating new channel for merchant ${merchantId} and user ${userId}`);
            // Logic to create channel could be added here
             await createChannelOnSendbird(userId, merchantId)
        }

        // Send marker message to user and merchant
        await sendMarkerMessage(userId, merchantId);
    } else {
        console.log("Routing message to existing conversation:", message);
    }
}

/**
 * Placeholder: Checks if a channel exists between a merchant and a user.
 * @param {string} merchantId - The merchant ID.
 * @param {string} userId - The user ID.
 * @returns {boolean} True if channel exists, otherwise false.
 */
async function checkExistingChannel(merchantId, userId) {
    try {
        const response = await axios.get(`https://api-D70D1F08-9EEB-4C33-82B6-639E6D652564.sendbird.com/v3/group_channels/${merchantId}_${userId}`, {}, {
          headers: {
            "Content-Type": "application/json", 
            "Api-Token": "779a8f82b664caf59081f1309d4254d0e5e0de9e"
          }
        });
        return response.status === 200; // Assuming 200 means the channel exists
    } catch (error) {
        console.log(`Error checking channel existence: ${error}`);
        return false;
    }
}

/**
 * Placeholder: Checks if a user exists on Sendbird.
 * @param {string} userId - The user ID.
 * @returns {boolean} True if user exists, otherwise false.
 */
async function checkUserExistsOnSendbird(userId) {
    try {
        const response = await axios.get(`https://api-D70D1F08-9EEB-4C33-82B6-639E6D652564.sendbird.com/v3/users/${userId}`,{},{
          headers: {
            "Content-Type": "application/json", 
            "Api-Token": "779a8f82b664caf59081f1309d4254d0e5e0de9e"
          }
        });
        return response.status === 200; // Assuming 200 means user exists
    } catch (error) {
        console.log(`Error checking user existence: ${error}`);
        return false;
    }
}

/**
 * Placeholder: Creates a new user on Sendbird if they do not exist.
 * @param {string} userId - The user ID.
 */
async function createUserOnSendbird(userId) {
    try {
        await axios.post("https://api-D70D1F08-9EEB-4C33-82B6-639E6D652564.sendbird.com/v3/users", 
        { 
          user_id: userId,
          nickname: "x", 
          profile_url: ""
        },
        {
          headers: {
            "Content-Type": "application/json", 
            "Api-Token": "779a8f82b664caf59081f1309d4254d0e5e0de9e"
          }
        });
        console.log(`User created: ${userId}`);
    } catch (error) {
        console.log(`Error creating user: ${error}`);
    }
}

/**
 * Placeholder: Creates a new channel on Sendbird.
 * @param {string} userId - The user ID.
 */
async function createChannelOnSendbird(userId, merchantId) {
    try {
        await axios.post("https://api-D70D1F08-9EEB-4C33-82B6-639E6D652564.sendbird.com/v3/group_channels", 
        { 
          user_ids: [userId, merchantId],
          name: "WhatsApp",
          channel_url: `${merchantId}_${userId}`
        },
        {
          headers: {
            "Content-Type": "application/json", 
            "Api-Token": "779a8f82b664caf59081f1309d4254d0e5e0de9e"
          }
        });
        console.log(`Channel created!`);
    } catch (error) {
        console.log(`Error creating channel: ${error}`);
    }
}

/**
 * Placeholder: Sends a marker message to the user and the merchant.
 * @param {string} userId - The user ID.
 * @param {string} merchantId - The merchant ID.
 */
async function sendMarkerMessage(userId, merchantId) {
    try {
        await axios.post(`https://api-D70D1F08-9EEB-4C33-82B6-639E6D652564.sendbird.com/v3/group_channels/${merchantId}_${userId}/messages`, {
            to: userId,
            message: `Marker message to user ${userId} and merchant ${merchantId}`
        });
        console.log(`Marker message sent to ${userId} and ${merchantId}`);
    } catch (error) {
        console.log(`Error sending marker message: ${error}`);
    }
}

// Start the server
app.listen(3000, () => console.log("Server started on port 3000"));