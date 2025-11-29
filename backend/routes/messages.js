const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const messageCtrl = require('../controllers/messageController');

router.get('/between/:userId', auth, messageCtrl.getBetween);

module.exports = router;
