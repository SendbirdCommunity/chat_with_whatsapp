require('dotenv').config();

const express = require("express");
const axios = require("axios");
const fs = require("fs");
const CryptoJS = require("crypto-js");
const app = express();
let channelMap = {};


// Use a secret key and IV from your environment variables
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 characters (256 bits)
const IV = process.env.IV; // Must be 16 characters (128 bits)

// Generate a 32-byte key (256 bits) for AES-256 encryption
// const key = crypto.randomBytes(32).toString("hex"); // 32 bytes -> 64 hex characters
// // Generate a 16-byte IV (128 bits) for AES-256-CBC
// const iv = crypto.randomBytes(16).toString("hex"); // 16 bytes -> 32 hex characters

// Convert ENCRYPTION_KEY and IV to WordArray objects for crypto-js
const key = CryptoJS.enc.Hex.parse(ENCRYPTION_KEY);
const iv = CryptoJS.enc.Hex.parse(IV);

// Encrypt function
function encrypt(text) {
    const encrypted = CryptoJS.AES.encrypt(text, key, { iv: iv });
    return encrypted.toString(); // return Base64-encoded string
}

// Decrypt function
function decrypt(encryptedText) {
    const decrypted = CryptoJS.AES.decrypt(encryptedText, key, { iv: iv });
    return decrypted.toString(CryptoJS.enc.Utf8); // decode to UTF-8
}

// Test encryption and decryption
const text = "Yo Jo";
const encryptedText = encrypt(text);
const decryptedText = decrypt(encryptedText);

console.log("Encrypted:", encryptedText);
console.log("Decrypted:", decryptedText);


// 1. Load Sensitive Tokens from .env File
const SENDBIRD_API_TOKEN = process.env.SENDBIRD_API_TOKEN;
const SENDBIRD_APP_ID = process.env.SENDBIRD_APP_ID;
const WHATSAPP_AUTH_TOKEN = process.env.WHATSAPP_AUTH_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// 2. Middleware Setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Load or Initialize Channel Map
try {
    const data = fs.readFileSync("channelMap.json", "utf8");
    channelMap = JSON.parse(data);
    console.log("Channel map loaded:", channelMap);
} catch (err) {
    console.log("No existing channel map found, starting fresh.");
}

function updateChannelMap(userId, channelUrl) {
    channelMap[userId] = channelUrl;
    fs.writeFile("channelMap.json", JSON.stringify(channelMap, null, 2), (err) => {
        if (err) {
            console.error("Error saving channel map:", err);
        } else {
            console.log(`Mapping saved: ${userId} -> ${channelUrl}`);
        }
    });
}

// 4. Sendbird Axios Instance
const sendbirdAxios = axios.create({
    baseURL: `https://api-${SENDBIRD_APP_ID}.sendbird.com/v3`,
    headers: {
        "Content-Type": "application/json",
        "Api-Token": SENDBIRD_API_TOKEN
    }
});

// 5. Webhook Endpoints

// Handle Incoming Messages from WhatsApp
app.post("/messages", async (req, res) => {
    console.log("POSTED HERE");
    parseWebhookData(req.body.entry);
    res.sendStatus(200);
});

// Verify Webhook
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

// Handle Incoming Messages from Sendbird
app.post("/webhook/sendbird", async (req, res) => {
    console.log(req.body);
    const event = req.body;
    res.sendStatus(200);
    if (event.category === "group_channel:message_send" && event.channel.channel_url.includes("iswhatsapp_")) {
        const { message, channel } = event.payload;
        const channel_url = channel.channel_url;
        const phoneNumber = extractPhoneNumberFromChannelUrl(channel_url);
        console.log(`Forwarding message to ${phoneNumber}: ${message}`);
        if (!channelMap[event.sender.user_id]) {
            forwardMessageToWhatsApp(phoneNumber, message);
        }
    }
});

// 6. Utility Functions

// Extract Chat Code from Message Text
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

// Extract Phone Number from Channel URL
function extractPhoneNumberFromChannelUrl(channelUrl) {
    const parts = channelUrl.split("_");
    return parts[2];
}

// 7. Core Processing Functions

// Parse Webhook Data and Process Each Entry
async function parseWebhookData(entries) {
    entries.forEach(async (entry) => {
        entry.changes.forEach(async (change) => {
            console.log("Field:", change.field);
            const { contacts, messages } = change.value;
            try {
                contacts.forEach(contact => console.log("Contact:", contact));
                for (const message of messages) {
                    if (message.type === 'text') {
                        console.log("FOUND TEXT MESSAGE");
                        await handleTextMessage(message);
                    }
                }
            } catch (e) {
                console.log("non_message_webhook", entry);
            }
        });
    });
}

// Handle Text Message by Extracting Chat Code and Managing Sendbird Channels/Users
async function handleTextMessage(message) {
    const code = extractChatCode(message.text.body);
    const userId = message.from;
    if (code) {
        const { merchant: merchantId, product } = code;
        console.log("Starting new conversation with code:", code);
        const channelExists = await checkExistingChannel(merchantId, userId);
        if (!channelExists) {
            const userExists = await checkUserExistsOnSendbird(userId);
            if (!userExists) await createUserOnSendbird(userId);
            await createChannelOnSendbird(userId, merchantId);
        }
        await sendMarkerMessage(userId, merchantId);
    } else {
        console.log("Sending user message to merchant");
        await sendMessageToMerchant(userId, channelMap[userId], message.text.body);
    }
}

// Check if a Channel Exists Between Merchant and User
async function checkExistingChannel(merchantId, userId) {
    try {
        const response = await sendbirdAxios.get(`/group_channels/iswhatsapp_${merchantId}_${userId}`);
        return response.status === 200;
    } catch (error) {
        console.log(`Error checking channel existence: ${error}`);
        return false;
    }
}

// Check if a User Exists on Sendbird
async function checkUserExistsOnSendbird(userId) {
    try {
        const response = await sendbirdAxios.get(`/users/${userId}`);
        return response.status === 200;
    } catch (error) {
        console.log(`Error checking user existence: ${error}`);
        return false;
    }
}

// Create a New User on Sendbird
async function createUserOnSendbird(userId) {
    try {
        await sendbirdAxios.post("/users", { user_id: userId, nickname: "x", profile_url: "" });
        console.log(`User created: ${userId}`);
    } catch (error) {
        console.log(`Error creating user: ${error}`);
    }
}

// Create a New Channel on Sendbird
async function createChannelOnSendbird(userId, merchantId) {
    const channelUrl = `iswhatsapp_${merchantId}_${userId}`;
    try {
        await sendbirdAxios.post("/group_channels", { 
            user_ids: [userId, merchantId],
            name: "WhatsApp",
            channel_url: channelUrl
        });
        console.log("Channel created!");
        updateChannelMap(userId, channelUrl);
    } catch (error) {
        console.log(`Error creating channel: ${error}`);
    }
}

// 8. Message Forwarding Functions

// Send a Regular Message to the Merchant
async function sendMessageToMerchant(userId, channelUrl, message) {
    try {
        await sendbirdAxios.post(`/group_channels/${channelUrl}/messages`, {
            user_id: userId,
            message: message
        });
        console.log(`Message sent to merchant on Sendbird`);
    } catch (error) {
        console.log(`Error sending message to merchant on Sendbird: ${error}`);
    }
}

// Send Marker Message to User on WhatsApp and Merchant on Sendbird
async function sendMarkerMessage(userId, merchantId) {
    try {
        await sendbirdAxios.post(`/group_channels/iswhatsapp_${merchantId}_${userId}/messages`, {
            user_id: userId,
            message: `Marker message to user ${userId} and merchant ${merchantId}`
        });
        console.log(`Marker message sent to ${userId} and ${merchantId} on Sendbird`);
    } catch (error) {
        console.log(`Error sending marker message on Sendbird: ${error}`);
    }
    try {
        await axios.post(
            `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_ID}/messages`,
            {
                messaging_product: "whatsapp",
                to: userId,
                type: "text",
                text: {
                    body: `Marker message for conversation with merchant ${merchantId}`
                }
            },
            {
                headers: {
                    "Authorization": `Bearer ${WHATSAPP_AUTH_TOKEN}`,
                    "Content-Type": "application/json"
                }
            }
        );
        console.log(`Marker message sent to ${userId} on WhatsApp`);
    } catch (error) {
        console.log(`Error sending marker message on WhatsApp: ${error}`);
    }
}

// Forward Message to WhatsApp
async function forwardMessageToWhatsApp(phoneNumber, messageText) {
    try {
        await axios.post(
            `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_ID}/messages`,
            {
                messaging_product: "whatsapp",
                to: phoneNumber,
                type: "text",
                text: { body: messageText }
            },
            {
                headers: {
                    "Authorization": `Bearer ${WHATSAPP_AUTH_TOKEN}`,
                    "Content-Type": "application/json"
                }
            }
        );
        console.log(`Message forwarded to WhatsApp for ${phoneNumber}`);
    } catch (error) {
        console.error(`Error forwarding message to WhatsApp: ${error}`);
    }
}

// 9. Start Server
// Start the server
app.listen(3000, () => console.log("Server started on port 3000"));