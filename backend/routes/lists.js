const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const listCtrl = require('../controllers/listController');

router.post('/', auth, listCtrl.createList);
router.get('/', auth, listCtrl.getLists);
router.post('/:listId/items', auth, listCtrl.addToList);
router.delete('/:listId/items/:movieId', auth, listCtrl.removeFromList);

module.exports = router;
