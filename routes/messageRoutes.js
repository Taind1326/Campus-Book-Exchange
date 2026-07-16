const express = require('express')

const {authenticateToken} = require('../middlewares/authMiddleware')

const {
    sendTextMessage,
    getConversationMessages,
    markConversationMessagesAsRead
} = require('../controllers/messageController')


const router = express.Router()

router.get('/conversation/:maCuoc', authenticateToken, getConversationMessages)

router.post('/', authenticateToken, sendTextMessage)

router.patch('/conversation/:maCuoc/read', authenticateToken, markConversationMessagesAsRead)


module.exports = router