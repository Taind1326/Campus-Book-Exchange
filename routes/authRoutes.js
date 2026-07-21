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

const {
    registerRateLimit,
    loginRateLimit,
    verifyOtpRateLimit,
    resendOtpRateLimit,
    createAccountRateLimit
} = require('../middlewares/authRateLimit')

const router = express.Router()

router.post('/register', registerRateLimit, register)
router.post('/verify-email', verifyOtpRateLimit, verifyEmailOtp)


router.post('/resend-verification', resendOtpRateLimit, resendEmailOtp)
router.post('/create-account', createAccountRateLimit, createAccount)

router.post('/login',  loginRateLimit, login)

router.get('/me', authenticateToken, getCurrentUser)

module.exports = router