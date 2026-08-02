const {
    rateLimit
} = require('express-rate-limit')


const apiRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: 'draft-7',
    legacyHeaders: false,

    skip: req => req.method === 'OPTIONS',
    message: {
        message: 'Bạn đã gửi quá nhiều yêu cầu. ' + 'Vui lòng thử lại sau!'}
})


module.exports = {
    apiRateLimit
}