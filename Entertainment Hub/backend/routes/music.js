const express = require("express");
const router = express.Router();
const axios = require("axios");

const FavoriteSong = require("../models/FavoriteSong");
const { getPlaylistTracks, getSpotifyToken } = require("../services/spotify");

// ----------------- Constants ----------------- //
const COUNTRY_TOP50_MAP = {
  LK: "79vXmU3ofwpqL0RhT4QBLw",
  IN: "37i9dQZEVXbLZqRxydqJYCQ",
  US: "37i9dQZEVXbLRQDuF5jeBp",
  GB: "37i9dQZEVXbLnolsZ8PSNw",
  SG: "37i9dQZEVXbK4gjvS1FjPY",
};

const GLOBAL_TOP50 = "37i9dQZEVXbMDoHDwVN2tF";

// ----------------- Middleware ----------------- //
// Verify API Key
function verifyApiKey(req, res, next) {
  const key = req.headers["x-api-key"];
  if (key !== process.env.API_KEY) {
    return res.status(401).json({ error: "Invalid API Key" });
  }
  next();
}

// ----------------- Utilities ----------------- //
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

// ----------------- Routes ----------------- //

// GET /api/music/aggregate
router.get("/aggregate", verifyApiKey, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.emails?.[0]?.value || "guest";
    const userName = req.user?.displayName || null;
    const userPhoto = req.user?.photos?.[0]?.value || null;


    const location = await getLocation(req);
    const playlistId =
      COUNTRY_TOP50_MAP[location.countryCode] || GLOBAL_TOP50;

    const trending = await getPlaylistTracks(playlistId);

    const favorites = await FavoriteSong.find({ userId });

    res.json({ userId, userName, userPhoto, location, trending, favorites });
  } catch (err) {
    console.error("Music aggregate error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/music/search?q=trackname
router.get("/search", verifyApiKey, async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.json([]);

    const token = await getSpotifyToken();

    const response = await axios.get(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=20`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const tracks = response.data.tracks.items.map((t) => ({
      trackId: t.id,
      trackName: t.name,
      artistName: t.artists.map((a) => a.name).join(", "),
      albumArt: t.album.images[0]?.url || "",
      previewUrl: t.preview_url,
    }));

    res.json(tracks);
  } catch (err) {
    console.error("Search error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/music/favorites
router.post("/favorites", verifyApiKey, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.emails?.[0]?.value || "guest";
    const fav = new FavoriteSong({ userId, ...req.body });
    await fav.save();
    res.json(fav);
  } catch (err) {
    console.error("Add favorite error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/music/favorites/:trackId
router.delete("/favorites/:trackId", verifyApiKey, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.emails?.[0]?.value || "guest";

    await FavoriteSong.findOneAndDelete({
      userId,
      trackId: req.params.trackId,
    });

    res.json({ message: "Removed from favorites" });
  } catch (err) {
    console.error("Remove favorite error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
