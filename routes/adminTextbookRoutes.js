const express = require('express')

const {
    getAdminTextbooks,
    getAdminTextbookDetail,
    hideTextbook,
    restoreTextbook,
    deleteTextbook
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

router.patch('/:maGT/hide', authenticateToken, authorizeAdmin, hideTextbook)
router.patch('/:maGT/restore', authenticateToken, authorizeAdmin, restoreTextbook)

router.delete('/:maGT', authenticateToken, authorizeAdmin, deleteTextbook)


module.exports = router