const List = require('../models/List');

exports.createList = async (req, res) => {
  try {
    const list = await List.create({ user: req.user._id, name: req.body.name });
    res.status(201).json(list);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getLists = async (req, res) => {
  try {
    const lists = await List.find({ user: req.user._id }).populate('items');
    res.json(lists);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addToList = async (req, res) => {
  try {
    const list = await List.findOne({ _id: req.params.listId, user: req.user._id });
    if (!list) return res.status(404).json({ message: 'List not found' });
    if (!list.items.includes(req.body.movieId)) list.items.push(req.body.movieId);
    await list.save();
    res.json(list);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.removeFromList = async (req, res) => {
  try {
    const list = await List.findOne({ _id: req.params.listId, user: req.user._id });
    if (!list) return res.status(404).json({ message: 'List not found' });
    list.items = list.items.filter(i => i.toString() !== req.params.movieId);
    await list.save();
    res.json(list);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
