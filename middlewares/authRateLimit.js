const {
    rateLimit,
    ipKeyGenerator
} = require('express-rate-limit')


function createAuthRateLimit(options) {
    const limiterOptions = {
        windowMs: options.windowMs,
        limit: options.limit,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: { message: options.message},
        skipSuccessfulRequests: options.skipSuccessfulRequests || false
    }

    if (typeof options.keyGenerator === 'function') {
        limiterOptions.keyGenerator = options.keyGenerator
    }

    return rateLimit(limiterOptions)
}


function loginKeyGenerator(req) {
    const ip = ipKeyGenerator(req.ip)
    const username = typeof req.body?.TENTK === 'string' ? req.body.TENTK.trim().toLowerCase() : 'unknown'
    return `${ip}:${username}`
}


const registerRateLimit = createAuthRateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 3,
    message: 'Bạn đã đăng ký quá nhiều lần. ' + 'Vui lòng thử lại sau!'
})


const loginRateLimit = createAuthRateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    message: 'Bạn đã đăng nhập quá nhiều lần. ' + 'Vui lòng thử lại sau!',
    skipSuccessfulRequests: true,
    keyGenerator: loginKeyGenerator
})


const verifyOtpRateLimit = createAuthRateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    message: 'Bạn đã nhập OTP quá nhiều lần. ' + 'Vui lòng thử lại sau!',
    skipSuccessfulRequests: true
})


const resendOtpRateLimit = createAuthRateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    message: 'Bạn đã yêu cầu gửi OTP quá nhiều lần. ' + 'Vui lòng thử lại sau!'
})


const createAccountRateLimit = createAuthRateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    message: 'Bạn đã tạo tài khoản quá nhiều lần. ' + 'Vui lòng thử lại sau!',
    skipSuccessfulRequests: true
})


module.exports = {
    registerRateLimit,
    loginRateLimit,
    verifyOtpRateLimit,
    resendOtpRateLimit,
    createAccountRateLimit
}