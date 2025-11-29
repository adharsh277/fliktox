const mongoose = require('mongoose');

const MovieSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  type: { type: String, enum: ['movie', 'anime'], default: 'movie' },
  genres: [String],
  releaseDate: Date,
  createdAt: { type: Date, default: Date.now },
  averageRating: { type: Number, default: 0 },
  ratingsCount: { type: Number, default: 0 }
});

module.exports = mongoose.model('Movie', MovieSchema);
