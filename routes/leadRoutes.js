const express = require('express');
const { getLeads } = require('../controllers/leadController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getLeads);

module.exports = router;
