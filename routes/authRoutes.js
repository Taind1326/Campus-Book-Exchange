const express = require('express')
const {
    register,
    verifyEmailOtp,
    resendEmailOtp,
    createAccount,
    login,
    getCurrentUser
} = require('../controllers/authController')

const {
    authenticateToken
} = require('../middlewares/authMiddleware')

const router = express.Router()

router.post('/register', register)
router.post('/verify-email', verifyEmailOtp)


router.post('/resend-verification', resendEmailOtp)
router.post('/create-account', createAccount)

router.post('/login', login)

router.get('/me', authenticateToken, getCurrentUser)

module.exports = router