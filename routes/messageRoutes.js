const express = require('express')

const {
    authenticateToken
} = require(
    '../middlewares/authMiddleware'
)

const {
    uploadMessageImages,
    validateUploadedImages
} = require(
    '../middlewares/uploadMiddleware'
)

const {
    getConversationMessages,
    markConversationMessagesAsRead,
    sendImageMessage,
    sendTextMessage
} = require(
    '../controllers/messageController'
)


const router = express.Router()


router.get(
    '/conversation/:maCuoc',
    authenticateToken,
    getConversationMessages
)


router.post(
    '/images',
    authenticateToken,
    uploadMessageImages.array(
        'images',
        5
    ),
    validateUploadedImages,
    sendImageMessage
)


router.post(
    '/',
    authenticateToken,
    sendTextMessage
)


router.patch(
    '/conversation/:maCuoc/read',
    authenticateToken,
    markConversationMessagesAsRead
)


module.exports = router