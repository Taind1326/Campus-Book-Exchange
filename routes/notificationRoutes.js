const express = require('express')

const {
    authenticateToken
} = require(
    '../middlewares/authMiddleware'
)

const {
    deactivatePushDevice,
    getNotifications,
    getUnreadNotificationCount,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    registerPushDevice
} = require(
    '../controllers/notificationController'
)


const router = express.Router()


router.get(
    '/',
    authenticateToken,
    getNotifications
)

router.get(
    '/unread-count',
    authenticateToken,
    getUnreadNotificationCount
)


router.post(
    '/push-device',
    authenticateToken,
    registerPushDevice
)

router.delete(
    '/push-device',
    authenticateToken,
    deactivatePushDevice
)


router.patch(
    '/read-all',
    authenticateToken,
    markAllNotificationsAsRead
)

router.patch(
    '/:id/read',
    authenticateToken,
    markNotificationAsRead
)


module.exports = router