const express = require('express')
const {authenticateToken} = require('../middlewares/authMiddleware')
const {getNotifications} = require('../controllers/notificationController')

const router = express.Router()

router.get('/', authenticateToken, getNotifications)

module.exports = router