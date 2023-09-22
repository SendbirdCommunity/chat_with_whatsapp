const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());
const APP_ID = process.env.APP_ID;
const API_TOKEN = process.env.API_TOKEN;

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

async function updateTicketStatus (channelUrl, status) {
  
  try {
    const ticket = await axios.get(`https://desk-api-${APP_ID}.sendbird.com/platform/v1/tickets?channel_url=${channelUrl}`, {
       headers: { 
         "Content-Type": "application/json; charset=utf8",
         "SENDBIRDDESKAPITOKEN": "b81ab50c9a840a33d5bc8976ac9892d0998c9696" 
       }
    })
    const ticketId = ticket.data.results[0].id
    const ticketUpdate = await axios.patch(`https://desk-api-${APP_ID}.sendbird.com/platform/v1/tickets/${ticketId}`,{
      "priority": status}, {
       headers: { 
         "Content-Type": "application/json; charset=utf8",
         "SENDBIRDDESKAPITOKEN": "b81ab50c9a840a33d5bc8976ac9892d0998c9696" 
       }
    })
  } catch (e) {
    console.log(e)
  }
  
}

// Helper function to add a user to a SendBird channel

app.post("/messages", async(req, res) => {
  
      // console.log(req.body)
  
      res.status(200).send("OK")
      const category = req.body.category
      if(category === 'group_channel:message_send'){
           const channelUrl = req.body.channel.channel_url
      console.log("CHANNEL_URL", channelUrl)
      // console.log(req.body)
      // console.log(req.body)
      try {
        const functionCall = JSON.parse(req.body.payload.data).function_calls[0].name
        if(functionCall === "hand_over_to_a_human") {
          console.log("HAND_OVER_TO_A_HUMAN")
          //talking_to BOT or HUMAN
          updateChannel(channelUrl, JSON.stringify({"talk_to": "HUMAN"}))
          updateTicketStatus(channelUrl, "HIGH")
          
        }
        if(functionCall === "hand_over_to_bot") {
          console.log("HAND_OVER_TO_A_BOT")
          updateChannel(channelUrl, JSON.stringify({"talk_to": "BOT"}))
          updateTicketStatus(channelUrl, "LOW")
        }
      } catch (e){
        console.log("not a bot function message")
        
      }
      }
})

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
    const response = await axios.post(endpoint, data, { headers: headers });
    return response.data;
  } catch (error) {
    console.log(error)
    throw new Error(`Failed to invite bot. Status: ${error.response.status}. Response: ${error.response.data}`);
  }
}


app.post("/new_ticket_webhook", async (req, res) => {

  
  const data = req.body.data
  const eventType = req.body.eventType
  if (eventType != 'TICKET.CREATED') return res.status(400).send("Not ticket create webhook")
  
  
  //Invite the bot to the channel to continue the conversation. 
  const channelUrl = data.channelUrl
  const botId = "ticket_bot_1"
  const sendInvite = await inviteBotToChannel(channelUrl, botId)
  //Send a channel invite using Sendbird's Platform API. 
  console.log(sendInvite)
  res.status(200).send("OK")
});

app.post("/bots", async (req, res) => {

  console.log("BOTS/")
  console.log(req.body)
  res.status(200).send("OK")
});

app.listen(3000, () => console.log("Server started on port 3000"));



