const mongoose = require('mongoose');

const ListSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Movie' }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('List', ListSchema);
