const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

async function createLead(content) {
  
  const { first_name, last_name, email, description, token } = content;
  
  let data = { 
    data: { 
      first_name: first_name || "Bob" , 
      last_name: last_name || "Smith", 
      email: email || "a@b.com", 
      description: description || "SOME TEXT" 
    }
  }
 console.log(data)
  let config = { headers: { "Content-Type": "application/json", Authorization: token}};

  try {
    const response = await axios.post("https://api.getbase.com/v2/leads", data, config);
    const result = JSON.stringify(response.data);
    return result 
  } catch (error) {
    // console.error(error.request);
    return JSON.stringify(error)
  }
}


app.post("/lead", async (req, res) => {
  const token = req.headers.authorization || null;
  const lead = await createLead({...req.body, token})
  //https://api.getbase.com/v2/leads
  console.log(lead)
  res.status(200).send(JSON.stringify(lead));
});

app.listen(3000, () => console.log("Server started on port 3000"));
