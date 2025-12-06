//to fetch IP location

const express = require("express");
const router = express.Router();

const axios = require("axios");

// Detect user's IP location
async function getLocation(req) {
  try {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.socket.remoteAddress ||
      "8.8.8.8"; // fallback

    const response = await axios.get(`https://ipapi.co/${ip}/json/`);

    return {
      city: response.data.city || "Colombo",
      country: response.data.country_name || "Sri Lanka",
      countryCode: response.data.country || "LK",
    };
  } catch (err) {
    console.error("IP location error:", err.message);
    return { city: "Colombo", country: "Sri Lanka", countryCode: "LK" };
  }
}

router.get("/", async (req, res) => {
  try {
    const location = await getLocation(req);
    res.json(location);
  } catch (err) {
    console.error("Location fetch error:", err);
    res.json({ city: "Colombo", country: "Sri Lanka", countryCode: "LK" });
  }
});

module.exports = router;
