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
  console.log(payload);
  let event = {};
  try {
    event = JSON.parse(payload.event.replace(/(\w+):/g, '"$1":'));
  } catch (e) {
    console.error("Error parsing event:", e);
  }

  return {
    ticket_id: payload.ticket_id,
    new_agent_email: payload.new_agent_email,
    event_responder_id_from: event.responder_id?.from,
    event_responder_id_to: event.responder_id?.to,
    sender_id: payload.sender_id,
  };
}

// Helper function to remove a user from a SendBird channel
async function removeFromChannel(channelUrl, userId) {
  await axios.put(
    `${SEND_BIRD_API_BASE_URL}/group_channels/${channelUrl}/leave`,
    {
      user_ids: [userId],
    },
    {
      headers: { "Api-Token": SEND_BIRD_API_TOKEN },
    }
  );
}

// Helper function to add a user to a SendBird channel
async function addToChannel(channelUrl, userId) {
  await axios.post(
    `${SEND_BIRD_API_BASE_URL}/group_channels/${channelUrl}/invite`,
    {
      user_ids: [userId],
    },
    {
      headers: { "Api-Token": SEND_BIRD_API_TOKEN },
    }
  );
}

app.post("/tickets", async (req, res) => {
  try {
    const parsedData = parsePayload(req.body);

    const channelUrl = `freshdesk_${parsedData.ticket_id}`;
    console.log(channelUrl);

    if (parsedData.event_responder_id_from !== null)
      await removeFromChannel(
        channelUrl,
        parsedData.event_responder_id_from.toString()
      );
    if (parsedData.event_responder_id_to !== null)
      await addToChannel(
        channelUrl,
        parsedData.event_responder_id_to.toString()
      );

    res.send("Received and parsed your request!");
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).send("Error processing request.");
  }
});

app.listen(3000, () => console.log("Server started on port 3000"));
