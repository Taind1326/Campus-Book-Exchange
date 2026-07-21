const requestBuckets = new Map()


function createAuthRateLimit(windowMs, maxRequests, message) {
    return function authRateLimit(req, res, next) {
        const key = `${req.ip}:${req.baseUrl}${req.path}`

        const now = Date.now()

        const current = requestBuckets.get(key)

        // Chưa có bucket hoặc bucket cũ đã hết hạn
        if (!current || current.resetAt <= now) {
            requestBuckets.set(key, {
                count: 1,
                resetAt: now + windowMs
            })

            return next()
        }

        // Đã vượt quá số request cho phép
        if ( current.count >= maxRequests) {
            const retryAfter = Math.ceil((current.resetAt - now) / 1000)
            res.set( 'Retry-After', String(retryAfter))

            return res.status(429).json({message})
        }

        current.count += 1

        return next()
    }
}


// Dọn các bucket đã hết hạn mỗi 10 phút
const cleanupInterval = setInterval(() => {
        const now = Date.now()

        for (const [key, value] of requestBuckets) {
            if (value.resetAt <= now) {
                requestBuckets.delete(key)
            }
        }
    },

    10 * 60 * 1000
)

/*
    Không để interval giữ Node.js chạy
    khi server cần dừng.
*/
cleanupInterval.unref()


const registerRateLimit =
    createAuthRateLimit(60 * 60 * 1000, 3, 'Bạn đã đăng ký quá nhiều lần. ' + 'Vui lòng thử lại sau!')


const loginRateLimit =
    createAuthRateLimit(
        15 * 60 * 1000,
        10,
        'Bạn đã đăng nhập quá nhiều lần. ' +
        'Vui lòng thử lại sau!'
    )


const verifyOtpRateLimit =
    createAuthRateLimit(
        15 * 60 * 1000,
        10,
        'Bạn đã nhập OTP quá nhiều lần. ' +
        'Vui lòng thử lại sau!'
    )


const resendOtpRateLimit =
    createAuthRateLimit(
        60 * 60 * 1000,
        10,
        'Bạn đã yêu cầu gửi OTP quá nhiều lần. ' +
        'Vui lòng thử lại sau!'
    )


const createAccountRateLimit =
    createAuthRateLimit(
        15 * 60 * 1000,
        10,
        'Bạn đã tạo tài khoản quá nhiều lần. ' +
        'Vui lòng thử lại sau!'
    )


module.exports = {
    registerRateLimit,
    loginRateLimit,
    verifyOtpRateLimit,
    resendOtpRateLimit,
    createAccountRateLimit
}