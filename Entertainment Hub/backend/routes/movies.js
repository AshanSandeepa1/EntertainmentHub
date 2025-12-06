const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();

// TMDb API key (store in .env ideally)
const TMDB_API_KEY = process.env.TMDB_API_KEY;

// Helper function to call TMDb
async function fetchTMDb(endpoint) {
  const url = `https://api.themoviedb.org/3/${endpoint}&api_key=${TMDB_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDb request failed: ${res.status}`);
  return res.json();
}

// Trending movies
router.get("/trending", async (req, res) => {
  try {
    const data = await fetchTMDb("trending/movie/week?language=en-US");
    res.json(data);
  } catch (err) {
    console.error("TMDb trending error:", err);
    res.status(500).json({ error: "Failed to fetch trending movies" });
  }
});

// Popular movies
router.get("/popular", async (req, res) => {
  try {
    const data = await fetchTMDb("movie/popular?language=en-US&page=1");
    res.json(data);
  } catch (err) {
    console.error("TMDb popular error:", err);
    res.status(500).json({ error: "Failed to fetch popular movies" });
  }
});

// Top rated movies
router.get("/top_rated", async (req, res) => {
  try {
    const data = await fetchTMDb("movie/top_rated?language=en-US&page=1");
    res.json(data);
  } catch (err) {
    console.error("TMDb top rated error:", err);
    res.status(500).json({ error: "Failed to fetch top rated movies" });
  }
});

// Search movies
router.get("/search", async (req, res) => {
  try {
    const query = encodeURIComponent(req.query.q || "");
    const data = await fetchTMDb(`search/movie?language=en-US&query=${query}&page=1&include_adult=false`);
    res.json(data);
  } catch (err) {
    console.error("TMDb search error:", err);
    res.status(500).json({ error: "Failed to search movies" });
  }
});

// Get movie videos (trailers)
router.get("/videos/:movieId", async (req, res) => {
  try {
    const movieId = req.params.movieId;
    const data = await fetchTMDb(`movie/${movieId}/videos?language=en-US`);
    res.json(data);
  } catch (err) {
    console.error("TMDb videos error:", err);
    res.status(500).json({ error: "Failed to fetch movie videos" });
  }
});

// Get full movie details
router.get("/details/:movieId", async (req, res) => {
  try {
    const movieId = req.params.movieId;
    const data = await fetchTMDb(`movie/${movieId}?language=en-US`);
    res.json(data);
  } catch (err) {
    console.error("TMDb details error:", err);
    res.status(500).json({ error: "Failed to fetch movie details" });
  }
});

// Get movie details
router.get("/:movieId", async (req, res) => {
  try {
    const movieId = req.params.movieId;
    const url = `https://api.themoviedb.org/3/movie/${movieId}?language=en-US&api_key=${TMDB_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("TMDb fetch failed");
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("TMDb fetch error:", err);
    res.status(500).json({ error: "Failed to fetch movie details" });
  }
});

// Get movie credits (actors)
router.get("/credits/:movieId", async (req, res) => {
  try {
    const movieId = req.params.movieId;
    const url = `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${TMDB_API_KEY}&language=en-US`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("TMDb fetch credits failed");
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("TMDb credits error:", err);
    res.status(500).json({ error: "Failed to fetch movie credits" });
  }
});


module.exports = router;
