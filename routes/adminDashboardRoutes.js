const express = require('express')

const {getAdminDashboard} = require('../controllers/adminDashboardController')

const {authenticateToken} = require('../middlewares/authMiddleware')

const {authorizeAdmin} = require('../middlewares/adminMiddleware')

const router = express.Router()

router.get('/', authenticateToken, authorizeAdmin, getAdminDashboard)

module.exports = router