const express = require("express");
const router = express.Router();
const axios = require("axios");
const EntertainmentItem = require("../models/entertainmentItem");

// ---------------- API KEY MIDDLEWARE ---------------- //
function verifyApiKey(req, res, next) {
  const key = req.headers["x-api-key"];
  if (key !== process.env.API_KEY) return res.status(401).json({ error: "Invalid API Key" });
  next();
}

// ---------------- CRUD ROUTES ---------------- //
router.post("/records", verifyApiKey, async (req, res) => {
  try {
    const item = new EntertainmentItem({
      ...req.body,
      createdBy: req.user ? req.user.emails[0].value : "Anonymous",
    });
    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/records", verifyApiKey, async (req, res) => {
  try {
    const items = await EntertainmentItem.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/records/:id", verifyApiKey, async (req, res) => {
  try {
    const item = await EntertainmentItem.findById(req.params.id);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/records/:id", verifyApiKey, async (req, res) => {
  try {
    const item = await EntertainmentItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/records/:id", verifyApiKey, async (req, res) => {
  try {
    await EntertainmentItem.findByIdAndDelete(req.params.id);
    res.json({ message: "Record deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- AGGREGATION ROUTE ---------------- //
router.get("/aggregate", verifyApiKey, async (req, res) => {
  try {
    const section = req.query.section || "all";
    const userName = req.user ? req.user.displayName : "Guest";
    const userPhoto = req.user?.photos?.[0]?.value || null;

    // ---------------- Get client IP ---------------- //
    const clientIP =
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.socket.remoteAddress ||
      "8.8.8.8";

    // ---------------- Fetch location via ipapi.co ---------------- //
    let location = {
      city: "Colombo",
      country: "Sri Lanka",
      countryCode: "LK",
      flag: "https://flagcdn.com/48x36/lk.png",
    };

    try {
      const locRes = await axios.get(`https://ipapi.co/${clientIP}/json/`);

      location = {
        city: locRes.data.city || "Colombo",
        country: locRes.data.country_name || "Sri Lanka",
        countryCode: locRes.data.country || "LK",
        flag: `https://flagcdn.com/48x36/${(locRes.data.country || "lk").toLowerCase()}.png`,
      };
    } catch (err) {
      console.warn("IP detection via ipapi failed, using fallback Colombo");
    }

    // ---------------- Aggregate Data ---------------- //
    const aggregated = { userName, userPhoto, location, data: {} };

    if (section === "all" || section === "weather" || section === "landing") {
      aggregated.data.weather = await fetchWeather(location.city);
    }

    if (section === "all" || section === "movies") {
      aggregated.data.movies = await fetchMovies();
    }

    if (section === "all" || section === "songs") {
      aggregated.data.songs = await fetchSongs();
    }

    if (section === "all" || section === "youtube") {
      aggregated.data.youtube = await fetchYouTube();
    }

    if (section === "all" || section === "news") {
      aggregated.data.news = await fetchNews();
    }

    res.json(aggregated);

  } catch (err) {
    console.error("Aggregate error:", err);
    res.status(500).json({ error: err.message });
  }
});


// ---------------- API FUNCTIONS ---------------- //

async function fetchMovies() {
  try {
    const res = await axios.get(`https://api.themoviedb.org/3/trending/movie/week?api_key=${process.env.TMDB_API_KEY}`);
    return res.data.results.slice(0, 5).map(m => ({
      title: m.title,
      release_date: m.release_date,
      overview: m.overview,
      poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`
    }));
  } catch { return []; }
}

async function fetchSongs() {
  try {
    const tokenRes = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    const token = tokenRes.data.access_token;
    const res = await axios.get('https://api.spotify.com/v1/playlists/37i9dQZF1DXcBWIGoYBM5M/tracks?limit=5', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.data.items.map(item => ({
      name: item.track.name,
      artist: item.track.artists.map(a => a.name).join(', '),
      album: item.track.album.name,
      preview_url: item.track.preview_url
    }));
  } catch { return []; }
}

async function fetchYouTube() {
  try {
    const res = await axios.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=entertainment&key=${process.env.YOUTUBE_API_KEY}`);
    return res.data.items.map(v => ({
      title: v.snippet.title,
      channel: v.snippet.channelTitle,
      thumbnail: v.snippet.thumbnails.medium.url,
      videoId: v.id.videoId
    }));
  } catch { return []; }
}

async function fetchNews() {
  try {
    const res = await axios.get(`https://newsapi.org/v2/top-headlines?category=entertainment&country=us&pageSize=5&apiKey=${process.env.NEWSAPI_KEY}`);
    return res.data.articles.map(a => ({
      title: a.title,
      source: a.source.name,
      url: a.url,
      publishedAt: a.publishedAt
    }));
  } catch { return []; }
}

async function fetchWeather(location) {
  try {
    const res = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${process.env.OPENWEATHER_KEY}&units=metric`);
    return {
      temp: res.data.main.temp,
      description: res.data.weather[0].description,
      icon: `http://openweathermap.org/img/wn/${res.data.weather[0].icon}@2x.png`
    };
  } catch { return {}; }
}

module.exports = router;
