const express = require('express')
const {authenticateToken} = require('../middlewares/authMiddleware')
const {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getUnreadNotificationCount
} = require('../controllers/notificationController')

const router = express.Router()

router.get('/', authenticateToken, getNotifications)
router.get('/unread-count', authenticateToken, getUnreadNotificationCount)


router.patch('/read-all', authenticateToken, markAllNotificationsAsRead)

router.patch('/:id/read', authenticateToken, markNotificationAsRead)

module.exports = router