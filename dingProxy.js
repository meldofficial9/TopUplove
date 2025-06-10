const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const cors = require("cors");
const qs = require("qs");

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let token = null;
let tokenExpiresAt = null;

// Get a fresh access token from Ding OAuth
const fetchOAuthToken = async () => {
  const now = Date.now();

  if (token && tokenExpiresAt && now < tokenExpiresAt - 60000) {
    // Token still valid for at least 60s
    return token;
  }

  try {
    const data = qs.stringify({
      grant_type: "client_credentials",
      client_id: process.env.DING_CLIENT_ID,
      client_secret: process.env.DING_CLIENT_SECRET,
    });

    const response = await axios.post("https://idp.ding.com/connect/token", data, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    token = response.data.access_token;
    tokenExpiresAt = now + response.data.expires_in * 1000;

    console.log("✅ Ding OAuth token refreshed");
    return token;
  } catch (error) {
    console.error("❌ Failed to get OAuth token:", error.response?.data || error.message);
    throw new Error("Failed to authenticate with Ding");
  }
};

// Proxy: POST /api/topup
app.post("/api/topup", async (req, res) => {
  try {
    const accessToken = await fetchOAuthToken();

    const response = await axios.post("https://api.dingconnect.com/api/V1/Topup", req.body, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Top-up error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data,
    });
  }
});

// Proxy: GET /api/countries
app.get("/api/countries", async (req, res) => {
  try {
    const accessToken = await fetchOAuthToken();

    const response = await axios.get("https://api.dingconnect.com/api/V1/GetCountries", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Countries error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data,
    });
  }
});

// Health check
app.get("/", (req, res) => {
  res.send("✅ Ding OAuth Proxy is running.");
});

app.listen(port, () => {
  console.log(`🚀 Ding Proxy Server running at http://localhost:${port}`);
});

