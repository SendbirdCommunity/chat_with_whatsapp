const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());


function insertRandomBanana(text) {
            const bananaEmoji = '🍌';
            const textArray = text.split(' ');

            for (let i = 0; i < textArray.length; i++) {
                if (Math.random() < 0.2) { // Adjust the probability as needed
                    textArray[i] += ' ' + bananaEmoji;
                }
            }
            text = textArray.join(' ');
            return text
        }

app.post("/drama", async (req, res) => {
  
  const dramaText = insertRandomBanana(req.body.text)
  res.status(200).send(dramaText)
})

app.get("/joke", async (req, res) => {
  console.log(req)
  const joke = `Why did the banana go to the doctor?
  Because it wasn't peeling well! 🍌😊`
  res.status(200).send(JSON.stringify(joke));
});


app.listen(3000, () => console.log("Server started on port 3000"));



