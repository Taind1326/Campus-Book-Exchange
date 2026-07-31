const express = require('express')

const {
    getAccounts,
    getAccountById,
    restrictAccount,
    unrestrictAccount,
    temporaryLockAccount,
    unlockAccount,
    permanentLockAccount
} = require('../controllers/adminAccountController')

const {
    authenticateToken
} = require('../middlewares/authMiddleware')

const {
    authorizeAdmin
} = require('../middlewares/adminMiddleware')


const router = express.Router()


router.get('/', authenticateToken, authorizeAdmin, getAccounts)
router.get('/:accountId', authenticateToken, authorizeAdmin, getAccountById)

router.patch('/:accountId/restrict', authenticateToken, authorizeAdmin, restrictAccount)
router.patch('/:accountId/unrestrict', authenticateToken, authorizeAdmin, unrestrictAccount)
router.patch('/:accountId/temporary-lock', authenticateToken, authorizeAdmin, temporaryLockAccount)
router.patch('/:accountId/unlock', authenticateToken, authorizeAdmin, unlockAccount)
router.patch('/:accountId/permanent-lock', authenticateToken, authorizeAdmin, permanentLockAccount)


module.exports = router