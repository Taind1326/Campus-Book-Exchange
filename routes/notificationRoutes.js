const express = require('express')
const {authenticateToken} = require('../middlewares/authMiddleware')
const {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead
} = require('../controllers/notificationController')

const router = express.Router()

router.get('/', authenticateToken, getNotifications)

router.patch('/read-all', authenticateToken, markAllNotificationsAsRead)

router.patch('/:id/read', authenticateToken, markNotificationAsRead)

module.exports = router