const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const app = express();
const fs = require("fs");
let channelMap = {};


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

const VERIFY_TOKEN = "mySecureVerifyToken123!"; // Replace with your custom token
const SEND_BIRD_API_TOKEN = "779a8f82b664caf59081f1309d4254d0e5e0de9e"; // Replace with your API token

// Create a custom axios instance with default settings
const sendbirdAxios = axios.create({
    baseURL: "https://api-D70D1F08-9EEB-4C33-82B6-639E6D652564.sendbird.com/v3",
    headers: {
        "Content-Type": "application/json",
        "Api-Token": SEND_BIRD_API_TOKEN
    }
});

// Middleware to capture raw body for signature verification
app.use(express.json({ verify: (req, _, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true, verify: (req, _, buf) => { req.rawBody = buf; } }));

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
 */
async function parseWebhookData(entries) {
    entries.forEach(async (entry) => {
        entry.changes.forEach(async (change) => {
            console.log("Field:", change.field);
            const messagingProduct = change.value.messaging_product;
            const metadata = change.value.metadata;
            const contacts = change.value.contacts;
            const messages = change.value.messages;

            // console.log("Messaging Product:", messagingProduct);
            // console.log("Metadata:", metadata);
            try {
              
            contacts.forEach(contact => console.log("Contact:", contact));
            for (const message of messages) {
                if (message.type === 'text') {
                    console.log("FOUND TEXT MESSAGE")
                    await handleTextMessage(message);
                }
            }
            } catch(e){
              console.log("non_message_webhook", entry)
            }

        });
    });
}

/**
 * Handles a text message by extracting chat code, managing Sendbird channels and users.
 */
async function handleTextMessage(message) {
    const code = extractChatCode(message.text.body);

    if (code) {
        console.log("Starting new conversation with code:", code);
        const merchantId = code.merchant;
        const product = code.product;
        const userId = message.from;

        let channelExists = await checkExistingChannel(merchantId, userId);
        if (!channelExists) {
            const userExists = await checkUserExistsOnSendbird(userId);
            if (!userExists) await createUserOnSendbird(userId);
            await createChannelOnSendbird(userId, merchantId);
        }
        await sendMarkerMessage(userId, merchantId);
    } else {
        console.log("Sending user message to merchant")
        const userId = message.from;
        await sendMessageToMerchant(userId, channelMap[userId], message.text.body)
    }
}

/**
 * Checks if a channel exists between a merchant and a user.
 */
async function checkExistingChannel(merchantId, userId) {
    try {
        const response = await sendbirdAxios.get(`/group_channels/iswhatsapp_${merchantId}_${userId}`);
        return response.status === 200;
    } catch (error) {
        console.log(`Error checking channel existence: ${error}`);
        return false;
    }
}

/**
 * Checks if a user exists on Sendbird.
 */
async function checkUserExistsOnSendbird(userId) {
    try {
        const response = await sendbirdAxios.get(`/users/${userId}`);
        return response.status === 200;
    } catch (error) {
        console.log(`Error checking user existence: ${error}`);
        return false;
    }
}

/**
 * Creates a new user on Sendbird if they do not exist.
 */
async function createUserOnSendbird(userId) {
    try {
        await sendbirdAxios.post("/users", { user_id: userId, nickname: "x", profile_url: "" });
        console.log(`User created: ${userId}`);
    } catch (error) {
        console.log(`Error creating user: ${error}`);
    }
}

/**
 * Creates a new channel on Sendbird.
 */
async function createChannelOnSendbird(userId, merchantId) {
    try {
        const channelUrl = `iswhatsapp_${merchantId}_${userId}`;
        await sendbirdAxios.post("/group_channels", { 
            user_ids: [userId, merchantId],
            name: "WhatsApp",
            channel_url: channelUrl
        });
        console.log("Channel created!");
        
        // Update the mapping after creating the channel
        updateChannelMap(userId, channelUrl);
    } catch (error) {
        console.log(`Error creating channel: ${error}`);
    }
}

/**
 * Sends a regular message to the merchant.
 */
/**
 * Sends a marker message to the user on WhatsApp and to the merchant on Sendbird.
 * @param {string} userId - The user ID on WhatsApp.
 * @param {string} merchantId - The merchant ID on Sendbird.
 */
async function sendMessageToMerchant(userId, channelUrl, message) {
    // Send marker message to Sendbird
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



/**
 * Sends a marker message to the user and the merchant.
 */
/**
 * Sends a marker message to the user on WhatsApp and to the merchant on Sendbird.
 * @param {string} userId - The user ID on WhatsApp.
 * @param {string} merchantId - The merchant ID on Sendbird.
 */
async function sendMarkerMessage(userId, merchantId) {
    // Send marker message to Sendbird
    try {
        await sendbirdAxios.post(`/group_channels/iswhatsapp_${merchantId}_${userId}/messages`, {
            user_id: userId,
            message: `Marker message to user ${userId} and merchant ${merchantId}`
        });
        console.log(`Marker message sent to ${userId} and ${merchantId} on Sendbird`);
    } catch (error) {
        console.log(`Error sending marker message on Sendbird: ${error}`);
    }

    // Send marker message to WhatsApp
    try {
        const whatsAppPhonenumberId = 476869702173665
        await axios.post(
            `https://graph.facebook.com/v20.0/${whatsAppPhonenumberId}/messages`, // Replace with actual WhatsApp API endpoint
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
                    "Authorization": `Bearer EAARYKrUEl0EBO39bS9LOrTwi3BGlUzTCsoQg7VKJV4zTxSo8I6X1DN674QefP56HYkhNAP4CN0w4Fi3PM8zIsQ29M0Lhjado8bLS7XrgiF6ZAD0Ra9mzLYTP7Kto3jg35tWmgFWeF8g5p9HLMKOrVMCMIn0Ac9c7sfqUQJLh0OXCsDLYsLBwEWGWqCzgtMbTCcVbBZAJC9a6LgGPnZCmPnQ`, // Replace with actual WhatsApp token
                    "Content-Type": "application/json"
                }
            }
        );
        console.log(`Marker message sent to ${userId} on WhatsApp`);
    } catch (error) {
        console.log(`Error sending marker message on WhatsApp: ${error}`);
    }
}


//Create a service that listens for sendbird messages... 
// Webhook endpoint to receive all messages from Sendbird
app.post("/webhook/sendbird", async (req, res) => {
    console.log(req.body)
    const event = req.body;

    // Send 200 OK immediately to Sendbird to acknowledge receipt
    res.sendStatus(200);

    // Check if the event is a 'message:send' and the channel URL contains 'iswhatsapp_'
    if (event.category === "group_channel:message_send" && event.channel.channel_url.includes("iswhatsapp_")) {
      console.log(event)
        // const { message, channel } = event;
        const channel = event.channel
        const messageText = event.payload.message
        const channel_url = channel.channel_url;
        
        // Extract phone number (userId) from channel URL
        const phoneNumber = extractPhoneNumberFromChannelUrl(channel_url);

        console.log(`Forwarding message to ${phoneNumber}: ${messageText}`);

        // Forward the message to WhatsApp asynchronously
        forwardMessageToWhatsApp(phoneNumber, messageText);
    }
});

// Function to extract phone number (userId) from channel URL
function extractPhoneNumberFromChannelUrl(channelUrl) {
    // Extracts the third part as the userId (phone number)
    const parts = channelUrl.split("_");
    return parts[2]; // Assumes `iswhatsapp_${merchantId}_${userId}` structure
}

// Function to forward the message to WhatsApp
async function forwardMessageToWhatsApp(phoneNumber, messageText) {
  const whatsAppPhonenumberId = 476869702173665
    try {
        await axios.post(
            `https://graph.facebook.com/v20.0/${whatsAppPhonenumberId}/messages`, // WhatsApp API endpoint
            {
                messaging_product: "whatsapp",
                to: phoneNumber,
                type: "text",
                text: {
                    body: messageText
                }
            },
            {
                headers: {
                    "Authorization": `Bearer EAARYKrUEl0EBO39bS9LOrTwi3BGlUzTCsoQg7VKJV4zTxSo8I6X1DN674QefP56HYkhNAP4CN0w4Fi3PM8zIsQ29M0Lhjado8bLS7XrgiF6ZAD0Ra9mzLYTP7Kto3jg35tWmgFWeF8g5p9HLMKOrVMCMIn0Ac9c7sfqUQJLh0OXCsDLYsLBwEWGWqCzgtMbTCcVbBZAJC9a6LgGPnZCmPnQ`, // Replace with actual WhatsApp token,
                    "Content-Type": "application/json"
                }
            }
        );
        console.log(`Message forwarded to WhatsApp for ${phoneNumber}`);
    } catch (error) {
        console.error(`Error forwarding message to WhatsApp: ${error}`);
    }
}




// Start the server
app.listen(3000, () => console.log("Server started on port 3000"));