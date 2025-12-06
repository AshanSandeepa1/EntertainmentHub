// backend/routes/youtube.js
const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();

const YT_API_KEY = process.env.YOUTUBE_API_KEY; 



// Main route to proxy YouTube API requests
router.get("/", async (req, res) => {
  try {
    let endpoint = req.query.endpoint;
    if (!endpoint) return res.status(400).json({ error: "Missing endpoint" });

    // Decode if frontend encoded
    endpoint = decodeURIComponent(endpoint);

    // Correctly append API key
    const url = endpoint.includes("?")
      ? `https://www.googleapis.com/youtube/v3/${endpoint}&key=${YT_API_KEY}`
      : `https://www.googleapis.com/youtube/v3/${endpoint}?key=${YT_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    res.json(data);
  } catch (err) {
    console.error("YouTube API fetch failed:", err);
    res.status(500).json({ error: "YouTube API fetch failed" });
  }
});

module.exports = router;
