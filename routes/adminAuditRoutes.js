const express = require('express')

const {
    getAdminAuditLogs,
    getAdminAuditDetail
} = require('../controllers/adminAuditController')

const {
    authenticateToken
} = require('../middlewares/authMiddleware')

const {
    authorizeAdmin
} = require('../middlewares/adminMiddleware')


const router = express.Router()


router.get('/', authenticateToken, authorizeAdmin, getAdminAuditLogs)
router.get('/:auditId', authenticateToken, authorizeAdmin, getAdminAuditDetail)


module.exports = router