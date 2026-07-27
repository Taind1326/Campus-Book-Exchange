const express = require('express')

const {
    getAdminReports,
    getAdminReportDetail
} = require('../controllers/adminReportController')

const {
    authenticateToken
} = require('../middlewares/authMiddleware')

const {
    authorizeAdmin
} = require('../middlewares/adminMiddleware')

const router = express.Router()

router.get('/', authenticateToken, authorizeAdmin, getAdminReports)
router.get('/:maBC', authenticateToken, authorizeAdmin, getAdminReportDetail)

module.exports = router