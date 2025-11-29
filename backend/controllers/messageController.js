const Message = require('../models/Message');

exports.createMessage = async ({ from, to, text }) => {
  // This can be used by socket handlers (no req/res)
  const msg = await Message.create({ from, to, text });
  return msg;
};

exports.getBetween = async (req, res) => {
  try {
    const { userId } = req.params; // conversation with this user
    const me = req.user._id;
    const messages = await Message.find({
      $or: [
        { from: me, to: userId },
        { from: userId, to: me }
      ]
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
