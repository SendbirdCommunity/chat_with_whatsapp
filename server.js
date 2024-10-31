const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const app = express();

/**
 * Middleware to capture raw body for Slack signature verification.
 */
app.use(express.json({ verify: (req, _, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true, verify: (req, _, buf) => { req.rawBody = buf; } }));


app.post("/messages", async (req, res) => {
    console.log("POSTED HERE");
    parseWebhookData(req.body.entry);  // Call the function to parse data
    res.sendStatus(200); // Acknowledge the event immediately
});

function extractChatCode(inputString) {
    const match = inputString.match(/code:(.+)/);
    const result = match ? match[1].trim() : null;
    try {
      return JSON.parse(result)
    } catch (e){
      console.log(e)
      return null
    }
    
}

// Example usage


// Main function to parse webhook data
function parseWebhookData(entries) {
    entries.forEach(entry => {
        entry.changes.forEach(change => {
            console.log("Field:", change.field); // Logs 'messages' or other fields
            handleWebhookChange(change);
        });
    });
}

// Handle each change in the webhook entry
function handleWebhookChange(change) {
    // Extract specific properties
    const messagingProduct = change.value.messaging_product;
    const metadata = change.value.metadata;  // Metadata object
    const contacts = change.value.contacts;  // Array of contact objects
    const messages = change.value.messages;  // Array of message objects

    console.log("Messaging Product:", messagingProduct);
    console.log("Metadata:", metadata);

    // Process contacts and messages
    if (Array.isArray(contacts)) {
        contacts.forEach(contact => console.log("Contact:", contact));
    }

    if (Array.isArray(messages)) {
        messages.forEach(message => handleMessage(message));
    }
}

// Handle individual messages within the webhook change
function handleMessage(message) {
    if (message.type === 'text') {
        const code = extractChatCode(message.text.body);

        if (code) {
            // New conversation start point
            const { merchant, product } = code;
            const userId = message.from;

            console.log("Starting new conversation:");
            console.log("Code:", code);
            console.log("Message:", message);

            // Check for an existing channel between user and merchant
            const channelExists = checkExistingChannel(merchant, userId);

            if (!channelExists) {
                // Ensure user exists on Sendbird
                if (!checkUserExistsOnSendbird(userId)) {
                    createUserOnSendbird(userId);
                }
            }

            // Send marker message to user and merchant
            sendMarkerMessage(userId, merchant);

        } else {
            // Route to existing conversation if no new code is present
            console.log("Routing message to existing conversation:");
            console.log("Message only:", message);
        }
    }
}

// Function to extract the chat code from message text
function extractChatCode(text) {
    // Assume some regex or parsing logic is used here to extract the code
    // Example placeholder: returns object if "code" is found, null otherwise
    const codeMatch = text.match(/your_code_regex_here/);
    return codeMatch ? { merchant: codeMatch[1], product: codeMatch[2] } : null;
}

// Placeholder for checking if a channel exists between merchant and user
function checkExistingChannel(merchantId, userId) {
    // GET request to Sendbird API
    console.log(`Checking channel for ${merchantId}_${userId}`);
    return false; // Replace with actual API response
}

// Placeholder for checking if a user exists on Sendbird
function checkUserExistsOnSendbird(userId) {
    // Sendbird API check for user existence
    console.log(`Checking if user exists: ${userId}`);
    return false; // Replace with actual API response
}

// Placeholder for creating a user on Sendbird if they do not exist
function createUserOnSendbird(userId) {
    // Sendbird API call to create user
    console.log(`Creating new user on Sendbird: ${userId}`);
}

// Placeholder for sending a marker message
function sendMarkerMessage(userId, merchantId) {
    console.log(`Sending marker message to user ${userId} and merchant ${merchantId}`);
    // Add logic for sending message via Sendbird API
}

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
