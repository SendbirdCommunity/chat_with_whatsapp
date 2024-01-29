const express = require("express");
const axios = require("axios");

// Initialize Express application
const app = express();

// Middleware to parse JSON bodies
// app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Define POST endpoint for creating a lead
app.post("/message_to_bot", async (req, res) => {
  console.log(req.body)
  res.status(200).send("okay"); // Send the result back to the client
});

// Start the server on port 3000
app.listen(3000, () => console.log("Server started on port 3000"));
