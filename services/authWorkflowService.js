const crypto = require('crypto')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const {sql} = require('../config/db')


const {
    getRegistrationConflicts: getRegistrationConflictsService,
    insertStudent: insertStudentService,
    expireActiveOtps: expireActiveOtpsService,
    insertEmailOtp: insertEmailOtpService,
    getLatestActiveOtp: getLatestActiveOtpService,
    getStudentRegistration:  getStudentRegistrationService,
    countOtpsLast24Hours: countOtpsLast24HoursService,
    recordWrongOtp: recordWrongOtpService,
    markEmailVerified: markEmailVerifiedService,
    insertAccount: insertAccountService
} = require('./authQueryService')


const {sendVerificationOtp: sendVerificationOtpService} = require('./mailService')


const PASSWORD_SALT_ROUNDS = 10
const OTP_SALT_ROUNDS = 8
const RESEND_WAIT_SECONDS = 60
const MAX_SENDS_PER_24_HOURS = 5


function businessError(statusCode, message) {
    const error = new Error(message)
    error.statusCode = statusCode
    return error
}


// Tạo OTP an toàn gồm đúng 6 chữ số
function generateOtp() {
    return crypto.randomInt(0, 1000000).toString().padStart(6, '0')
}


// Bước 1:
// Tạo hồ sơ SINHVIEN và gửi OTP
// Chưa tạo TAIKHOAN
async function registerStudent(student) {
    const otp = generateOtp()
    const otpHash = await bcrypt.hash(otp, OTP_SALT_ROUNDS)
    const transaction = new sql.Transaction()

    let transactionStarted = false

    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE)
        transactionStarted = true

        const conflicts = await getRegistrationConflictsService(
                transaction,
                student.maSV,
                student.soDienThoai,
                student.email
            )

        if (conflicts.MASV_TONTAI === 1) {
            throw businessError(409,'Mã sinh viên đã được đăng ký!')
        }

        if (conflicts.SDT_TONTAI === 1) {
            throw businessError(409, 'Số điện thoại đã được sử dụng!')
        }

        if (conflicts.EMAIL_TONTAI === 1) {
            throw businessError(409, 'Email đã được sử dụng!')
        }

        await insertStudentService(
            transaction,
            student.maSV,
            student.tenSV,
            student.soDienThoai,
            student.email
        )

        await insertEmailOtpService(
            transaction,
            student.maSV,
            otpHash
        )

        await transaction.commit()

        transactionStarted = false
    }

    catch (error) {
        if (transactionStarted) {
            await transaction.rollback()
        }

        throw error
    }

    try {
        await sendVerificationOtpService(
            student.email,
            student.tenSV,
            otp
        )
    }

    catch (error) {
    console.log('Lỗi gửi email OTP:', error)

    throw businessError(
        503,
        'Chưa gửi được OTP. Vui lòng thử gửi lại sau!'
    )
}

    return { maSV: student.maSV, email: student.email}
}


// Gửi lại OTP
async function resendVerification(data) {
    const student = await getStudentRegistrationService(data.maSV, data.email)

    if (!student) {
        throw businessError( 404, 'Không tìm thấy hồ sơ đăng ký!')
    }

    if (student.COTAIKHOAN === 1) {
        throw businessError(409,'Hồ sơ này đã có tài khoản!')
    }

    const latestOtp = await getLatestActiveOtpService(data.maSV)

    if (latestOtp) {
        const secondsSinceLastSend = Number(latestOtp.SOGIAYTULANGUI)

        if (secondsSinceLastSend < RESEND_WAIT_SECONDS) {
            const remainingSeconds = Math.ceil(RESEND_WAIT_SECONDS - secondsSinceLastSend)

            throw businessError(429, `Vui lòng chờ ${remainingSeconds} giây ` + 'trước khi gửi lại OTP!')
        }
    }

    const numberOfOtps = await countOtpsLast24HoursService(data.maSV)

    if (numberOfOtps >= MAX_SENDS_PER_24_HOURS) {
        throw businessError(429, 'Bạn đã vượt quá số lần gửi OTP ' + 'trong 24 giờ!')
    }

    const otp = generateOtp()
    const otpHash = await bcrypt.hash(otp, OTP_SALT_ROUNDS)
    const transaction = new sql.Transaction()
    let transactionStarted = false

    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE)

        transactionStarted = true

        await expireActiveOtpsService(transaction, data.maSV)

        await insertEmailOtpService(
            transaction,
            data.maSV,
            otpHash
        )

        await transaction.commit()

        transactionStarted = false
    }

    catch (error) {
        if (transactionStarted) {
            await transaction.rollback()
        }

        throw error
    }

    try {
        await sendVerificationOtpService(student.EMAIL, student.TENSV, otp)
    }

    catch (error) {
    console.error('Lỗi SMTP gửi lại OTP:', {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode
    })

    throw businessError(
        503,
        'Chưa gửi được OTP. Vui lòng thử gửi lại sau!'
    )
}

    return true
}


// Bước 2:
// Kiểm tra OTP và xác minh email
async function verifyEmail(data) {
    const verification = await getLatestActiveOtpService(data.maSV)

    if (!verification) {
        throw businessError(400, 'Mã OTP không tồn tại hoặc đã hết hiệu lực!')
    }

   if (Number(verification.CONHIEULUC) !== 1) {
        throw businessError(400, 'Mã OTP đã hết hạn!')
}

    const otpIsCorrect = await bcrypt.compare(data.otp, verification.MAOTP_HASH)

    if (!otpIsCorrect) {
        await recordWrongOtpService(verification.MAXACMINH)

        const remainingAttempts = Math.max(0, 4 - verification.SOLANSAI)

        if (remainingAttempts === 0) {
            throw businessError(400, 'OTP đã bị khóa. ' + 'Vui lòng yêu cầu mã mới!')
        }

        throw businessError(400, `Mã OTP không đúng! Bạn còn ` + `${remainingAttempts} lần thử.`)
    }

    const transaction = new sql.Transaction()

    let transactionStarted = false

    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE)

        transactionStarted = true

        const verified = await markEmailVerifiedService(transaction, verification.MAXACMINH, data.maSV)

        if (!verified) {
            throw businessError(409, 'Mã OTP đã được sử dụng ' + 'hoặc đã hết hạn!')
        }

        await transaction.commit()

        transactionStarted = false
    }

    catch (error) {
        if (transactionStarted) {
            await transaction.rollback()
        }

        throw error
    }


    const registrationToken = jwt.sign(
        {
            MASV: data.maSV,
            PURPOSE: 'CREATE_ACCOUNT'
        },

        process.env.JWT_SECRET,

        {
            expiresIn:
                process.env
                    .REGISTRATION_TOKEN_EXPIRES_IN || '15m'
        }
    )

    return {
        registrationToken
    }
}


// Bước 3:
// Tạo TENTK và mật khẩu sau khi đã xác minh email
async function createVerifiedAccount(data) {
    let tokenData

    try {
        tokenData = jwt.verify(
            data.registrationToken,
            process.env.JWT_SECRET
        )
    }

    catch (error) {
        throw businessError(401, 'Phiên tạo tài khoản đã hết hạn ' + 'hoặc không hợp lệ!')
    }

    if (tokenData.PURPOSE !== 'CREATE_ACCOUNT' || !tokenData.MASV) {
        throw businessError(401, 'Phiên tạo tài khoản không hợp lệ!')
    }

    const matKhauHash = await bcrypt.hash(data.matKhau, PASSWORD_SALT_ROUNDS)
    const transaction = new sql.Transaction()

    let transactionStarted = false

    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE)

        transactionStarted = true

        const account = await insertAccountService(
                transaction,
                tokenData.MASV,
                data.tenTaiKhoan,
                matKhauHash
            )

        await transaction.commit()

        transactionStarted = false

        return account
    }

    catch (error) {
        if (transactionStarted) {
            await transaction.rollback()
        }

        if (error.number === 50001) {
            throw businessError(403, 'Email chưa được xác minh!')
        }

        if (error.number === 50002) {
            throw businessError(409, 'Hồ sơ sinh viên đã có tài khoản!')
        }

        if (error.number === 50003 || error.number === 2601 || error.number === 2627) {
            throw businessError(409, 'Tên tài khoản đã tồn tại!')
        }

        throw error
    }
}


module.exports = {
    registerStudent,
    resendVerification,
    verifyEmail,
    createVerifiedAccount
}