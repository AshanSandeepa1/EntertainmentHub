const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();

// -----------------------------------------------------------------------------
// Load API KEY
// -----------------------------------------------------------------------------
const NEWS_API_KEY = process.env.NEWS_API_KEY || "7f9932173d594d4795a0b22f888ca5b9";

if (!NEWS_API_KEY) {
  console.warn("⚠️ WARNING: NEWS_API_KEY is missing. Add it to your .env file!");
}

// -----------------------------------------------------------------------------
// Helper: Safe fetch wrapper for NewsAPI
// -----------------------------------------------------------------------------
async function fetchNews(url) {
  const res = await fetch(url);
  const text = await res.text();

  try {
    const json = JSON.parse(text);

    if (json.status === "error") {
      throw new Error(json.message || "NewsAPI error");
    }

    return json;
  } catch (err) {
    console.error("NewsAPI Raw Response:", text);
    throw new Error(`NewsAPI failed: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// 1. ENTERTAINMENT MAIN FEED
// -----------------------------------------------------------------------------
router.get("/entertainment", async (req, res) => {
  try {
    const page = req.query.page || 1;
    const url =
      `https://newsapi.org/v2/everything?` +
      `q=entertainment OR movies OR hollywood OR celebrity` +
      `&language=en&pageSize=12&page=${page}` +
      `&sortBy=publishedAt` +
      `&apiKey=${NEWS_API_KEY}`;

    const data = await fetchNews(url);

    res.json({ articles: data.articles });
  } catch (err) {
    console.error("Entertainment news error:", err.message);
    res.status(500).json({ error: "Failed to fetch entertainment news" });
  }
});

// -----------------------------------------------------------------------------
// 2. SEARCH NEWS
// -----------------------------------------------------------------------------
router.get("/search", async (req, res) => {
  try {
    const q = req.query.q || "";
    const page = req.query.page || 1;

    const url =
      `https://newsapi.org/v2/everything?` +
      `q=${encodeURIComponent(q)}` +
      `&language=en&pageSize=12&page=${page}` +
      `&sortBy=publishedAt` +
      `&apiKey=${NEWS_API_KEY}`;

    const data = await fetchNews(url);

    res.json({ articles: data.articles }); // ✅ return as articles
  } catch (err) {
    console.error("News search error:", err.message);
    res.status(500).json({ error: "Failed to search news" });
  }
});

// -----------------------------------------------------------------------------
// 3. TOPIC FILTERS
// -----------------------------------------------------------------------------
const TOPIC_MAP = {
  hollywood: "hollywood OR celebrity OR actor OR actress",
  music: "music industry OR songs OR artist OR album",
  gaming: "gaming OR video games OR esports",
  tv: "tv shows OR streaming OR netflix OR hbo",
  movies: "movies OR cinema OR film"
};

router.get("/topic", async (req, res) => {
  try {
    const tag = req.query.tag?.toLowerCase() || "hollywood";
    const page = req.query.page || 1;

    const keyword = TOPIC_MAP[tag] || tag;

    const url =
      `https://newsapi.org/v2/everything?` +
      `q=${encodeURIComponent(keyword)}` +
      `&language=en&pageSize=12&page=${page}` +
      `&sortBy=popularity` +
      `&apiKey=${NEWS_API_KEY}`;

    const data = await fetchNews(url);

    res.json({ articles: data.articles }); // ✅ return as articles
  } catch (err) {
    console.error("Topic fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch topic news" });
  }
});

// -----------------------------------------------------------------------------
// 4. ARTICLE PROXY (Optional)
// -----------------------------------------------------------------------------
router.get("/article", async (req, res) => {
  try {
    const articleUrl = req.query.url;
    if (!articleUrl) {
      return res.status(400).json({ error: "Missing URL" });
    }

    const raw = await fetch(articleUrl);
    const html = await raw.text();

    res.send(html);
  } catch (err) {
    console.error("Article proxy error:", err.message);
    res.status(500).json({ error: "Failed to load article content" });
  }
});

module.exports = router;
