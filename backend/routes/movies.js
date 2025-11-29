const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const movieCtrl = require('../controllers/movieController');

router.post('/', auth, movieCtrl.createMovie);
router.get('/', movieCtrl.getMovies);
router.get('/:id', movieCtrl.getMovie);
router.put('/:id', auth, movieCtrl.updateMovie);
router.delete('/:id', auth, movieCtrl.deleteMovie);

module.exports = router;
