const mongoose = require("mongoose");

const FavoriteSongSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  trackId: { type: String, required: true },
  trackName: String,
  artistName: String,
  albumArt: String,
  previewUrl: String,
}, { timestamps: true });

module.exports = mongoose.model("FavoriteSong", FavoriteSongSchema);
