const Comment = require('../models/Comment');

exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    const reviewId = req.params.reviewId;
    const comment = await Comment.create({ user: req.user._id, review: reviewId, text });
    res.status(201).json(comment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getByReview = async (req, res) => {
  try {
    const comments = await Comment.find({ review: req.params.reviewId }).populate('user', 'name');
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!comment) return res.status(404).json({ message: 'Not found or unauthorized' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
