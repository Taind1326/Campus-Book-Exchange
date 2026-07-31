const express = require('express')

const {
    getAdminSupports,
    getAdminSupportDetail
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

module.exports = router