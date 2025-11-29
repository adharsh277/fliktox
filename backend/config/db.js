const mongoose = require('mongoose');

const connectDB = async (uri) => {
  try {
    const mongoUri = uri || process.env.MONGO_URI;
    await mongoose.connect(mongoUri, {
      // options are managed by Mongoose 7+
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
