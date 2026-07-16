const express = require('express')

const {authenticateToken} = require('../middlewares/authMiddleware')

const {getUserConversations} = require('../controllers/conversationController')

const router = express.Router()

router.get('/', authenticateToken, getUserConversations)

module.exports = router