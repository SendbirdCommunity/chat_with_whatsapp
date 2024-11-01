# WhatsApp to Sendbird Integration

This application integrates WhatsApp messaging with Sendbird's chat API, allowing messages sent through WhatsApp to be relayed to a specific Sendbird channel. It also supports initiating WhatsApp conversations from Sendbird messages. This integration uses a simple encryption method to handle sensitive data within channel URLs and user IDs.

## Prerequisites

- **Node.js**: Ensure you have Node.js and npm installed.
- **Sendbird Account**: You need a Sendbird app with an API token.
- **WhatsApp Business Account**: Set up a WhatsApp Business API with a registered phone number.

## Setup

1. **Clone the repository**:

    ```bash
    git clone https://github.com/SendbirdCommunity/chat_with_whatsapp.git
    cd your-repository
    ```

2. **Install dependencies**:

    ```bash
    npm install
    ```

3. **Configure Environment Variables**:

   Create a `.env` file in the project root and add your configuration values:

    ```env
    SENDBIRD_API_TOKEN=<Your Sendbird API Token>
    SENDBIRD_APP_ID=<Your Sendbird App ID>
    WHATSAPP_AUTH_TOKEN=<Your WhatsApp Auth Token>
    WHATSAPP_PHONE_ID=<Your WhatsApp Phone Number ID>
    VERIFY_TOKEN=<Webhook verification token>
    ENCRYPTION_KEY=<Your 32-character Encryption Key>
    IV=<Your 16-character IV>
    ```

## Key Functions

- **Encryption/Decryption**: `encrypt` and `decrypt` functions manage secure storage and retrieval of phone numbers in URLs.
- **Webhook Handling**:
    - `POST /messages`: Receives and parses incoming messages from WhatsApp.
    - `POST /webhook/sendbird`: Receives events from Sendbird's webhook, forwarding relevant messages to WhatsApp.
    - `GET /messages`: Verifies WhatsApp webhook requests.

## Code Overview

1. **Encryption Utilities**:
    - Functions to encrypt and decrypt sensitive information in URLs.

2. **Channel Management**:
    - Functions to create and check the existence of Sendbird channels and users, facilitating seamless message forwarding.

3. **Message Forwarding**:
    - Forward messages between WhatsApp and Sendbird, allowing for bidirectional communication.

4. **Marker Messages**:
    - Sends marker messages for context to both WhatsApp and Sendbird users.

## Running the Application

1. **Start the Server**:

    ```bash
    node app.js
    ```

2. **Server Port**: The server runs on `http://localhost:3000` by default.

## Usage

- **Testing Encryption**: Logs encrypted and decrypted text for a "TEST" string on startup.
- **Initialize Channel Map**: On first run, a `channelMap.json` will be created or loaded if present.
- **Forwarding Messages**: Send messages from WhatsApp to a predefined Sendbird channel and vice versa.

## Additional Notes

- **Data Persistence**: `channelMap.json` stores user-channel mappings.
- **Secure Keys**: Ensure the `ENCRYPTION_KEY` and `IV` are strong and stored securely.

## Troubleshooting

- **Missing Channel Map**: If `channelMap.json` is not found, the app will start with an empty map.
- **Webhook Verification**: Ensure `VERIFY_TOKEN` matches your WhatsApp verification token during setup.

---

This project allows integration with Sendbird and WhatsApp, supporting message encryption and efficient channel management for secure messaging relay.
