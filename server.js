const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const app = express();

/**
 * Middleware to capture raw body for Slack signature verification.
 */
app.use(express.json({ verify: (req, _, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true, verify: (req, _, buf) => { req.rawBody = buf; } }));

const key = crypto.randomBytes(32); // 256-bit key
const iv = crypto.randomBytes(16);  // Initialization vector

function encrypt(merchantId) {
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(merchantId, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return { iv: iv.toString('hex'), encryptedData: encrypted };
}

function decrypt(encryptedData, iv) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

const encryptedData  = encrypt("Merchant123");
console.log("Encrypted:", encryptedData);
console.log("Decrypted:", decrypt(encryptedData.encryptedData, encryptedData.iv));


app.post("/messages", async (req, res) => {
    console.log("POSTED HERE");
    parseWebhookData(req.body.entry);  // Call the function to parse data
    res.sendStatus(200); // Acknowledge the event immediately
});

function extractChatCode(inputString) {
    const match = inputString.match(/code:(.+)/);
    return match ? match[1].trim() : null;
}

// Example usage


function parseWebhookData(entries) {
  
    entries.forEach(entry => {
        // Loop through each change within the entry
        entry.changes.forEach(change => {
            console.log("Field:", change.field);  // logs 'messages' or any other field

            // Extract specific properties from the change object
            const messagingProduct = change.value.messaging_product;
            const metadata = change.value.metadata;    // Metadata object
            const contacts = change.value.contacts;    // Array of contact objects
            const messages = change.value.messages;    // Array of message objects

            console.log("Messaging Product:", messagingProduct);
            console.log("Metadata:", metadata);

            // Loop through contacts and messages if they are arrays
            contacts.forEach(contact => {
                console.log("Contact:", contact);
            });

            messages.forEach(message => {
                //Check if the message is a Click-To-Chat message. 
                if(message.type === 'text'){
                const code = extractChatCode(message.text.body)
                if(code){
                //New conversation start point. 
                 //get user details - code.merchant and hashed message.from  
                //1 Send marker message back to use and to merchant. 
                     
                  //Check if there is a channel between the two. 
                      //If not check if the user exists on Sendbird and create if they do not. 
            
                console.log("Code:", code);             
                console.log("Message:", message);    
                } else {
                  //Route message to existing conversation. 
                  console.log("Message only:", message);  
                }
                           
                }
     
            });
        });
    });
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
