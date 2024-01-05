# SendBird Desk API Integration

This Node.js project demonstrates a comprehensive integration with SendBird Desk API. It includes features like handling new ticket webhooks, updating ticket status, and inviting bots to channels in SendBird.

## Features

- **Ticket Handling**: Processes new ticket creation events and updates ticket status.
- **Bot Integration**: Invites bots to SendBird channels, facilitating automated responses.
- **Channel Management**: Adds or removes users from SendBird channels.

## Requirements

- Node.js
- npm (Node Package Manager)
- Environment Variables: `APP_ID`, `API_TOKEN`, `SENDBIRDDESKAPITOKEN`

## Installation


1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Set your environment variables for `APP_ID`, `API_TOKEN`, and `SENDBIRDDESKAPITOKEN`.


## Usage

1. Start the server with `npm start` or `node app.js`.
2. The server will run on `http://localhost:3000`.

## API Endpoints

- `POST /hand_off`: Handles handing over a conversation to a human agent.
- `POST /new_ticket_webhook`: Receives new ticket creation events.
- `POST /bots`: Endpoint for bot-related operations.

## Code Highlights

- `parsePayload`: Parses incoming webhook payload.
- `updateChannel`: Updates SendBird channel information.
- `updateTicketStatus`: Updates the status of a ticket in SendBird Desk.
- `inviteBotToChannel`: Invites a bot to a SendBird channel.

## Error Handling

The code includes error handling for API requests and responses, ensuring robust operation under various conditions.

---

For more details on the SendBird Desk API and its capabilities, refer to the [SendBird Desk API Documentation](https://sendbird.com/docs).

---

_This README is designed to provide a clear, concise overview of the project's functionality and usage. Adjust as necessary to fit the specific needs of your deployment._
