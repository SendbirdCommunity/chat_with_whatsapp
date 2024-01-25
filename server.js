const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

function createLead(content) {
  
  const { first_name, last_name, email, description   } = content
  
  
  let data = JSON.stringify({
    data: {
      first_name,
      last_name,
      email,
      description: "The user looks like a typical lead for these reasons.",
    },
  });

  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://api.getbase.com/v2/leads",
    headers: {
      "Content-Type": "application/json",
      Authorization:
        "Bearer 810eb98743bd317d704e91135b6179ef00d6b0d17849d7f0b95e160388ca4657",
    },
    data: data,
  };

  axios
    .request(config)
    .then((response) => {
      console.log(JSON.stringify(response.data));
    })
    .catch((error) => {
      console.log(error);
    });
}

app.post("/lead", async (req, res) => {
  const token = req.headers.authorization || null;
  console.log(token);
  console.log(req.body);
  //https://api.getbase.com/v2/leads
  res.status(200).send("okay");
});

app.listen(3000, () => console.log("Server started on port 3000"));
