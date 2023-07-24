// Import express module
const express = require('express');

// Create a new express application
const app = express();

// Use express's JSON middleware to automatically parse JSON requests
app.use(express.json());

// Define the function to parse the payload
function parsePayload(payload) {
  // Parse the 'event' field into an actual JSON object
  let event = {};
  try {
    event = JSON.parse(payload.event.replace(/(\w+):/g, '"$1":'));
  } catch (e) {
    console.error('Error parsing event:', e);
  }

  // Construct an object from the parsed parts of the payload
  const parsedData = {
    ticket_id: payload.ticket_id,
    new_agent_email: payload.new_agent_email,
    event_responder_id_from: event.responder_id?.from,
    event_responder_id_to: event.responder_id?.to,
    sender_id: payload.sender_id
  };

  return parsedData;
}

// Define an endpoint at /tickets for POST requests
app.post('/tickets', (req, res) => {
  // Get the payload from the request
  const payload = req.body;

  // Parse the payload using the parsePayload function
  const parsedData = parsePayload(payload);

  // Log the parsed data as JSON
  console.log(JSON.stringify(parsedData, null, 2));

  // Send a response
  res.send('Received and parsed your request!');
});

// Start the server on port 3000
app.listen(3000, () => console.log('Server started on port 3000'));
