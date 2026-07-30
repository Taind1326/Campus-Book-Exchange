const express = require('express')

const {
    getAdminTextbooks,
    getAdminTextbookDetail
} = require('../controllers/adminTextbookController')

const {
    authenticateToken
} = require('../middlewares/authMiddleware')

const {
    authorizeAdmin
} = require('../middlewares/adminMiddleware')

const router = express.Router()


router.get('/', authenticateToken, authorizeAdmin, getAdminTextbooks)
router.get('/:maGT', authenticateToken, authorizeAdmin, getAdminTextbookDetail)

module.exports = router