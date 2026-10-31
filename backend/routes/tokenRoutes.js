const express = require('express');
const router = express.Router();
const tokenController = require('../controllers/tokenController');

router.post('/issue', tokenController.issueToken);
router.get('/status/:tokenNumber', tokenController.getTokenStatus);
router.get('/', tokenController.getAllTokens);

module.exports = router;
