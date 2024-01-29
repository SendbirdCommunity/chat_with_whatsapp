const express = require("express");
const axios = require("axios");

// Initialize Express application
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

/**
 * Creates a new lead by sending a POST request to an external API.
 * 
 * @param {Object} content - The content object containing lead information.
 * @param {string} [content.first_name="NOT GIVEN"] - The first name of the lead. Defaults to "NOT GIVEN" if not provided.
 * @param {string} [content.last_name="NOT GIVEN"] - The last name of the lead. Defaults to "NOT GIVEN" if not provided.
 * @param {string} [content.email="a@b.com"] - The email of the lead. Defaults to "a@b.com" if not provided.
 * @param {string} [content.description="SOME TEXT"] - The description of the lead. Defaults to "SOME TEXT" if not provided.
 * @param {string} content.token - The authorization token required by the external API.
 * @returns {Promise<string>} A promise that resolves to the response from the external API as a string.
 */
async function createLead(content) {
  const { first_name, last_name, email, description, token } = content;
  
  let data = { 
    data: { 
      first_name: first_name || "NOT GIVEN", 
      last_name: last_name || "NOT GIVEN", 
      email: email || "a@b.com", 
      description: description || "SOME TEXT" 
    }
  };

  let config = { headers: { "Content-Type": "application/json", Authorization: token } };

  try {
    const response = await axios.post("https://api.getbase.com/v2/leads", data, config);
    const result = JSON.stringify(response.data);
    return result;
  } catch (error) {
    return JSON.stringify(error);
  }
}

// Define POST endpoint for creating a lead
app.post("/lead", async (req, res) => {
  const token = req.headers.authorization || null;
  const lead = await createLead({ ...req.body, token });
  console.log(lead); // Log the result for debugging purposes
  res.status(200).send(lead); // Send the result back to the client
});

// Start the server on port 3000
app.listen(3000, () => console.log("Server started on port 3000"));
