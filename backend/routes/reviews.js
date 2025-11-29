const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/auth');
const reviewCtrl = require('../controllers/reviewController');

router.post('/:movieId', auth, reviewCtrl.addReview);
router.get('/:movieId', reviewCtrl.getByMovie);
router.put('/id/:id', auth, reviewCtrl.updateReview);
router.delete('/id/:id', auth, reviewCtrl.deleteReview);

module.exports = router;
