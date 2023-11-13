const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());
const APP_ID = process.env.APP_ID;
const API_TOKEN = process.env.API_TOKEN;
const SENDBIRDDESKAPITOKEN = process.env.SENDBIRDDESKAPITOKEN

// SendBird API Base URL
const SEND_BIRD_API_BASE_URL = `https://api-${APP_ID}.sendbird.com/v3`;

// SendBird API token
const SEND_BIRD_API_TOKEN = API_TOKEN;

// Function to parse the payload
function parsePayload(payload) {
  let event = {};
  try {
    event = JSON.parse(payload.event.replace(/(\w+):/g, '"$1":'));
  } catch (e) {
    console.error("Error parsing event:", e);
  }

  console.log(payload)
  
  return {
    ticket_id: payload.ticket_id,
    new_agent_email: payload.new_agent_email,
    event_responder_id_from: event.responder_id.from,
    event_responder_id_to: event.responder_id.to,
    sender_id: payload.sender_id,
  };
}

// Helper function to remove a user from a SendBird channel
async function updateChannel(channelUrl, data) {
  try {
      await axios.put(
    `${SEND_BIRD_API_BASE_URL}/group_channels/${channelUrl}`,{data},{
      headers: { "Api-Token": SEND_BIRD_API_TOKEN },
    }
  );    
  } catch(e) {
    console.log("FAILED TO UPDATE CHANNEL", e)
  }
}

async function updateTicketStatus (channelUrl) {
  
  try {
    const ticket = await axios.get(`https://desk-api-${APP_ID}.sendbird.com/platform/v1/tickets?channel_url=${channelUrl}`, {
       headers: { 
         "Content-Type": "application/json; charset=utf8",
         "SENDBIRDDESKAPITOKEN": SENDBIRDDESKAPITOKEN
       }
    })
    const ticketId = ticket.data.results[0].id
    const ticketUpdate = await axios.patch(`https://desk-api-${APP_ID}.sendbird.com/platform/v1/tickets/${ticketId}`,{
      "priority": "HIGH"}, {
       headers: { 
         "Content-Type": "application/json; charset=utf8",
         "SENDBIRDDESKAPITOKEN": SENDBIRDDESKAPITOKEN
       }
    })
    const assignGroup = await axios.post(`https://desk-api-${APP_ID}.sendbird.com/platform/v1/tickets/transfer_to_group`,{
      "tickets": [ticketId],
      "status": "PENDING",
      "groupKey":"example1"
    
    }, {
       headers: { 
         "Content-Type": "application/json; charset=utf8",
         "SENDBIRDDESKAPITOKEN": SENDBIRDDESKAPITOKEN
       }
    })
  } catch (e) {
    console.log(e)
  }
}

// Helper function to add a user to a SendBird channel
app.post("/hand_off", async(req, res) => {
  
      console.log(req.body)
      const channelUrl = req.body.channel_url
      try {
          await updateTicketStatus(channelUrl)
          res.status(200).send({"message":"handing over to a human. Just a minute please."})
      } catch (e){
        res.status(400).send({"error":true, "message":"Failed to perform hand over"})
      }
})

/**
 * Invites a bot to a SendBird channel using the provided channel URL and bot ID.
 * 
 * This function sends a POST request to the SendBird API, inviting the bot to the specified channel.
 * 
 * @async
 * @function
 * @param {string} channelUrl - The URL of the channel to which the bot is being invited.
 * @param {string} botId - The ID of the bot to be invited.
 * 
 * @throws Will throw an error if the invitation fails.
 *
 * @example
 * const result = await inviteBotToChannel("some_channel_url", "some_bot_id");
 *
 * @returns {Object} Returns an object containing the API response data.
 */
async function inviteBotToChannel(channelUrl, botId) {
  const endpoint = `https://api-${APP_ID}.sendbird.com/v3/group_channels/${channelUrl}/invite`;
  const headers = {
    'Content-Type': 'application/json',
    'Api-Token': API_TOKEN 
  };
  const data = {
    user_ids: [botId]
  };

  try {
    // Send a POST request to invite the bot
    const response = await axios.post(endpoint, data, { headers: headers });
    return response.data;
  } catch (error) {
    // Throw an error if the invitation fails
    throw new Error(`Failed to invite bot. Status: ${error.response.status}. Response: ${error.response.data}`);
  }
}


/**
 * POST handler for '/new_ticket_webhook'.
 * 
 * This function gets triggered when a POST request is made to '/new_ticket_webhook'. 
 * It is intended to respond only to events of type 'TICKET.CREATED'. Upon receiving 
 * such an event, it invites a bot to the channel.
 *
 * @async
 * @function
 * @param {Object} req - The Express request object. Expects `req.body.data` to contain 
 *                       ticket-related data, and `req.body.eventType` to specify the type of event.
 * @param {Object} res - The Express response object.
 *
 * @example
 * // POST request with JSON payload:
 * // {
 * //   "data": {
 * //     "channelUrl": "some_url"
 * //   },
 * //   "eventType": "TICKET.CREATED"
 * // }
 *
 * @returns {void}
 */
app.post("/new_ticket_webhook", async (req, res) => {
  const data = req.body.data; // Extract data from request body
  const eventType = req.body.eventType; // Extract event type from request body
  
  // Check if the event type is 'TICKET.CREATED'
  if (eventType !== 'TICKET.CREATED') return res.status(400).send("Not ticket create webhook");
  const channelUrl = data.channelUrl; // Extract channel URL from data
  const botId = "ticket_bot_1"; // Specify bot ID
  
  // Invite bot to the channel
  const sendInvite = await inviteBotToChannel(channelUrl, botId);
  console.log("INVITED BOT TO CHANNEL")
  // Send 200 OK response
  res.status(200).send("OK");
});



app.post("/bots", async (req, res) => {

  console.log("BOTS/")
  console.log(req.body)
  res.status(200).send("OK")
});

app.listen(3000, () => console.log("Server started on port 3000"));



