const express = require('express')

const {
    getAdminReports,
    getAdminReportDetail,
    claimReport,
    resolveReport
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

router.patch('/:maBC/claim', authenticateToken, authorizeAdmin, claimReport)
router.patch('/:maBC/resolve', authenticateToken, authorizeAdmin, resolveReport)

module.exports = router