const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());




app.get("/joke", async (req, res) => {
  console.log(req)
  const joke = `Why did the banana go to the doctor?
  Because it wasn't peeling well! 🍌😊`
  res.status(200).send(JSON.stringify(joke));
});


app.listen(3000, () => console.log("Server started on port 3000"));



