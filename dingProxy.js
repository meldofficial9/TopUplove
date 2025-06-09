
const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post("/api/topup", async (req, res) => {
  try {
    const response = await axios.post(
      "https://api.ding.com/topup",
      req.body,
      {
        headers: {
          "api-key": process.env.DING_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    if (error.response && error.response.status === 403) {
      try {
        const ipRes = await axios.get(
          `http://api.ipstack.com/check?access_key=${process.env.IPSTACK_API_KEY}`
        );
        return res.status(403).json({
          message: "403 Forbidden - IP likely needs to be whitelisted",
          ip_info: ipRes.data,
        });
      } catch (ipError) {
        return res.status(403).json({
          message: "403 Forbidden - IP needs to be whitelisted",
          ip_error: ipError.message,
        });
      }
    }
    res.status(500).json({ error: error.message });
  }
});

app.get("/", (req, res) => {
  res.send("Ding Proxy Server is running.");
});

app.listen(port, () => {
  console.log(`Ding Proxy Server listening at http://localhost:${port}`);
});
