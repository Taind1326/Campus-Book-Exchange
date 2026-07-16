const express = require('express')

const {authenticateToken} = require('../middlewares/authMiddleware')

const {
    sendTextMessage,
    getConversationMessages
} = require('../controllers/messageController')

const router = express.Router()

router.get('/conversation/:maCuoc', authenticateToken, getConversationMessages)
router.post('/', authenticateToken, sendTextMessage)


module.exports = router