require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const passport = require("passport");
const session = require("express-session");
const path = require("path");

require("./config/passport"); // Google OAuth strategy
const entertainmentRoutes = require("./routes/entertainment");


const app = express();

// ----------------- MIDDLEWARE ----------------- //
// CORS for frontend, allow credentials
app.use(
  cors({
    origin: "http://localhost:5000", // frontend URL
    credentials: true,
  })
);

app.use(express.json());

// Session setup for Passport
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false, // only save session when logged in
    cookie: {
      httpOnly: true,
      secure: false, // true if using HTTPS
      sameSite: "lax",
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ----------------- ROUTES ----------------- //
// Music routes
app.use("/api/music", require("./routes/music"));

// Entertainment or other API routes
app.use("/api", entertainmentRoutes);

// Config route (example: OpenWeather API key)
app.get("/api/config", (req, res) => {
  res.json({ OPENWEATHER_KEY: process.env.OPENWEATHER_KEY });
});

// YouTube routes
const youtubeRouter = require("./routes/youtube");
app.use("/api/youtube", youtubeRouter);

// Movies routes
const moviesRouter = require("./routes/movies");
app.use("/api/movies", moviesRouter);

// News routes
const newsRouter = require("./routes/news");
app.use("/api/news", newsRouter);

// Location route
app.use("/api/location", require("./routes/location"));



// ----------------- OAUTH ROUTES ----------------- //
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("/"); // Redirect to frontend after login
  }
);

// ----------------- CURRENT USER ----------------- //
// Returns logged-in user info or null if guest
app.get("/api/user", (req, res) => {
  if (req.isAuthenticated()) {
    const { id, displayName, emails, photos } = req.user;
    res.json({
      id,
      displayName,
      email: emails?.[0]?.value,
      photo: photos?.[0]?.value,
    });
  } else {
    res.json(null);
  }
});

// ----------------- FRONTEND SERVING ----------------- //
// Serve static files from frontend folder
app.use(express.static(path.join(__dirname, "frontend")));

// Fallback route for SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend/index.html"));
});

// ----------------- MONGO CONNECTION ----------------- //
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ Mongo Error:", err));

// ----------------- START SERVER ----------------- //
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
