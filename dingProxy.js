const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const cors = require("cors");
const qs = require("qs");

dotenv.config();
const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(express.json());

let token = null;
let tokenExpiresAt = null;

// 🔐 Fetch OAuth token
const fetchOAuthToken = async () => {
  const now = Date.now();

  if (token && tokenExpiresAt && now < tokenExpiresAt - 60000) {
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

// ✅ Get products by country
app.get("/api/getproductsbycountry/:countryCode", async (req, res) => {
  try {
    const accessToken = await fetchOAuthToken();
    const { countryCode } = req.params;

    console.log("📦 Fetching products for country:", countryCode);

    const response = await axios.get(
      `https://api.dingconnect.com/api/V1/GetProductsByCountry?countryCode=${countryCode}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    res.json({
      success: true,
      products: response.data,
    });
  } catch (error) {
    console.error("❌ Product fetch error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: "Failed to fetch products",
      details: error.response?.data || error.message,
    });
  }
});

// 🔁 Top-up endpoint
app.post("/api/topup", async (req, res) => {
  try {
    const accessToken = await fetchOAuthToken();
    console.log("📦 Top-up request body:", req.body);

    const response = await axios.post(
      "https://api.dingconnect.com/api/V1/SendTransfer",
      req.body,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Top-up error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data,
    });
  }
});

// ✅ Validate phone number (corrected)
app.post("/api/validate", async (req, res) => {
  try {
    const accessToken = await fetchOAuthToken();
    const { to, countryCode, skuCode } = req.body;

    if (!to || !countryCode || !skuCode) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: 'to', 'countryCode', or 'skuCode'",
      });
    }

    const payload = {
      accountNumber: to,
      skuCode,
      distributorRef: "validate-" + Date.now(),
      sendValue: 1,
    };

    const response = await axios.post(
      "https://api.dingconnect.com/api/V1/ValidatePhoneBookAccount",
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json({
      success: true,
      validation: response.data,
    });
  } catch (error) {
    console.error("❌ Validate error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: "Validation failed",
      details: error.response?.data || error.message,
    });
  }
});

// 🌍 Get countries
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

// 🔍 Health check
app.get("/", (req, res) => {
  res.send("✅ Ding OAuth Proxy is running.");
});

app.listen(port, () => {
  console.log(`🚀 Ding Proxy Server running on port ${port}`);
});
