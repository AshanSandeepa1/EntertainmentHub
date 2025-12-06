const mongoose = require("mongoose");

const EntertainmentSchema = new mongoose.Schema({
  movies: Array,
  songs: Array,
  games: Array,
  news: Array,
  youtube: Array,
  weather: Object,
  createdBy: String,
}, { timestamps: true });

module.exports = mongoose.model("EntertainmentItem", EntertainmentSchema);
