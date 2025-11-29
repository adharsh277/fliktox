const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/auth');
const commentCtrl = require('../controllers/commentController');

router.post('/:reviewId', auth, commentCtrl.addComment);
router.get('/:reviewId', commentCtrl.getByReview);
router.delete('/id/:id', auth, commentCtrl.deleteComment);

module.exports = router;
