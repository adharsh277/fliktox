const Review = require('../models/Review');
const Movie = require('../models/Movie');

async function recalcMovieRating(movieId) {
  const reviews = await Review.find({ movie: movieId });
  const count = reviews.length;
  const avg = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
  await Movie.findByIdAndUpdate(movieId, { averageRating: avg, ratingsCount: count });
}

exports.addReview = async (req, res) => {
  try {
    const { rating, text } = req.body;
    const movieId = req.params.movieId;
    const review = await Review.create({ user: req.user._id, movie: movieId, rating, text });
    await recalcMovieRating(movieId);
    res.status(201).json(review);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getByMovie = async (req, res) => {
  try {
    const reviews = await Review.find({ movie: req.params.movieId }).populate('user', 'name');
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const review = await Review.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, req.body, { new: true });
    if (!review) return res.status(404).json({ message: 'Not found or unauthorized' });
    await recalcMovieRating(review.movie);
    res.json(review);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!review) return res.status(404).json({ message: 'Not found or unauthorized' });
    await recalcMovieRating(review.movie);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
