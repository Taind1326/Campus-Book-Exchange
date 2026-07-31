const express = require('express')

const {
    getAdminSupports,
    getAdminSupportDetail,
    assignSupport,
    updateSupportPriority,
    replySupport,
    closeSupport
} = require('../controllers/adminSupportController')

const {
    authenticateToken
} = require('../middlewares/authMiddleware')

const {
    authorizeAdmin
} = require('../middlewares/adminMiddleware')


const router = express.Router()


router.get('/', authenticateToken, authorizeAdmin, getAdminSupports)
router.get('/:maPhanHoi', authenticateToken, authorizeAdmin, getAdminSupportDetail)

router.patch('/:maPhanHoi/assign', authenticateToken, authorizeAdmin, assignSupport)
router.patch('/:maPhanHoi/priority', authenticateToken, authorizeAdmin, updateSupportPriority)
router.patch('/:maPhanHoi/reply', authenticateToken, authorizeAdmin, replySupport)
router.patch('/:maPhanHoi/close', authenticateToken, authorizeAdmin, closeSupport)

module.exports = router