const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const {sql} = require('../config/db')


const {
    validateStudentInfo,
    validateOtpRequest,
    validateResendRequest,
    validateAccountInfo
} = require('../validators/authValidator')


const {
    registerStudent: registerStudentWorkflow,
    verifyEmail: verifyEmailWorkflow,
    resendVerification: resendVerificationWorkflow,
    createVerifiedAccount: createVerifiedAccountWorkflow
} = require('../services/authWorkflowService')

function handleAuthError(res, error, action) {
    console.log(`Lỗi ${action}:`, error)

    if (error.statusCode) {
        return res.status(error.statusCode).json({message: error.message})
    }

    if (error.number === 2601 || error.number === 2627) {
        return res.status(409).json({message: 'Thông tin đăng ký đã được sử dụng!'})
    }

    return res.status(500).json({message: `Không thể ${action}!`})
}

// Bước 1: lưu hồ sơ sinh viên và gửi OTP
async function register(req, res) {
    try {
        const student = validateStudentInfo(req.body)
        const registration = await registerStudentWorkflow(student)

        return res.status(201).json({message: 'Đã gửi OTP đến email. ' + 'Vui lòng xác minh để tiếp tục!', registration})
    }

    catch (error) {
        return handleAuthError(res, error, 'đăng ký')
    }
}


// Bước 2: xác minh OTP
async function verifyEmailOtp(req, res) {
    try {
        const data = validateOtpRequest(req.body)
        const result = await verifyEmailWorkflow(data)

        return res.status(200).json({message: 'Xác minh email thành công! ' + 'Vui lòng tạo tên tài khoản và mật khẩu.',
            registrationToken:
                result.registrationToken
        })
    }

    catch (error) {
        return handleAuthError(res, error, 'xác minh email')
    }
}


// Gửi lại OTP
async function resendEmailOtp(req, res) {
    try {
        const data = validateResendRequest(req.body)

        await resendVerificationWorkflow(data)

        return res.status(200).json({message: 'Đã gửi lại OTP đến email!'})
    }

    catch (error) {
        return handleAuthError(res, error, 'gửi lại OTP')
    }
}


// Bước 3: tạo tên tài khoản và mật khẩu
async function createAccount(req, res) {
    try {
        const data = validateAccountInfo(req.body)
        const account = await createVerifiedAccountWorkflow(data)

        return res.status(201).json({message: 'Tạo tài khoản thành công! ' + 'Bạn có thể đăng nhập.', account})
    }

    catch (error) {
        return handleAuthError(res, error, 'tạo tài khoản')
    }
}


async function login(req, res) {
    const {TENTK, MATKHAU, GHI_NHO = false} = req.body

    if (typeof TENTK !== 'string' || typeof MATKHAU !== 'string' || typeof GHI_NHO !== 'boolean') {
        return res.status(400).json({message: 'Dữ liệu đăng nhập không hợp lệ!'})
    }

    const tenTaiKhoan = TENTK.trim()

    if (!tenTaiKhoan || !MATKHAU) {
        return res.status(400).json({ message: 'Vui lòng nhập tên tài khoản và mật khẩu!'})
    }

    const normalizedUsername = tenTaiKhoan.toLowerCase()

    try {
        const result = await sql.query`
            SELECT TK.MATK, TK.TENTK, TK.MATKHAU_HASH, TK.VAITRO, TK.TRANGTHAI, TK.LYDOHANCHED, TK.HANCHEDEN,
                    SV.MASV, SV.EMAIL, SV.TENSV, SV.SDT
            FROM TAIKHOAN TK
            JOIN SINHVIEN SV ON TK.MASV = SV.MASV
            WHERE TK.TENTK = ${normalizedUsername}`

        if (result.recordset.length === 0) {
            return res.status(401).json({message: 'Tên tài khoản hoặc mật khẩu không chính xác!'})
        }

        const taiKhoan = result.recordset[0]
        const matKhauDung = await bcrypt.compare(MATKHAU, taiKhoan.MATKHAU_HASH)

        if (!matKhauDung) {
            return res.status(401).json({message: 'Tên tài khoản hoặc mật khẩu không chính xác!' })
        }

        if ((taiKhoan.TRANGTHAI === 'Bị hạn chế' || taiKhoan.TRANGTHAI === 'Tạm khóa') &&
            taiKhoan.HANCHEDEN && new Date(taiKhoan.HANCHEDEN).getTime() <= Date.now()) {
            await sql.query`
                UPDATE TAIKHOAN
                SET TRANGTHAI = N'Hoạt động',
                    LYDOHANCHED = NULL,
                    HANCHEDEN = NULL
                WHERE MATK = ${taiKhoan.MATK}`

            taiKhoan.TRANGTHAI = 'Hoạt động'
            taiKhoan.LYDOHANCHED = null
            taiKhoan.HANCHEDEN = null
        }

        if (taiKhoan.TRANGTHAI === 'Tạm khóa') {
            return res.status(403).json({message: 'Tài khoản đang tạm bị khóa!'})
        }

        if (taiKhoan.TRANGTHAI === 'Đã khóa') {
            return res.status(403).json({message: 'Tài khoản đã bị khóa!'})
        }

        const thoiHanToken =
            GHI_NHO
                ? (
                    process.env
                        .JWT_REMEMBER_EXPIRES_IN || '30d'
                )
                : (
                    process.env.JWT_EXPIRES_IN || '2h'
                )

        const token = jwt.sign(
            {
                MATK: taiKhoan.MATK,
                TENTK: taiKhoan.TENTK,
                VAITRO: taiKhoan.VAITRO
            },

            process.env.JWT_SECRET,

            {
                expiresIn: thoiHanToken
            }
        )

        await sql.query`
            UPDATE TAIKHOAN
            SET LANCUOIDANGNHAP = SYSDATETIME()
            WHERE MATK = ${taiKhoan.MATK}`

        return res.status(200).json({
            message: 'Đăng nhập thành công!', token, user: {
                MATK: taiKhoan.MATK,
                MASV: taiKhoan.MASV,
                EMAIL: taiKhoan.EMAIL,
                TENSV: taiKhoan.TENSV,
                TENTK: taiKhoan.TENTK,
                SDT: taiKhoan.SDT,
                VAITRO: taiKhoan.VAITRO,
                TRANGTHAI: taiKhoan.TRANGTHAI
            }
        })
    }

    catch (error) {
        console.log('Lỗi đăng nhập!', error)

        return res.status(500).json({message: 'Không thể đăng nhập!'})
    }
}


async function getCurrentUser(req, res) {
    try {
        const result = await sql.query`
            SELECT TK.MATK, TK.TENTK, TK.VAITRO, TK.TRANGTHAI, TK.LYDOHANCHED, TK.HANCHEDEN,
                    TK.NGAYTAO, TK.LANCUOIDANGNHAP, SV.MASV, SV.EMAIL, SV.TENSV, SV.SDT, SV.NGAYXACMINHEMAIL
            FROM TAIKHOAN TK
            JOIN SINHVIEN SV ON TK.MASV = SV.MASV
            WHERE TK.MATK = ${req.user.MATK}`

        if (result.recordset.length === 0) {
            return res.status(404).json({message: 'Không tìm thấy thông tin tài khoản!'})
        }

        return res.status(200).json({ user: result.recordset[0]})
    }

    catch (error) {
        console.log('Lỗi lấy thông tin tài khoản!', error)

        return res.status(500).json({message: 'Không thể lấy thông tin tài khoản!'})
    }
}


module.exports = {
    register, 
    verifyEmailOtp,
    resendEmailOtp,
    createAccount,
    login, 
    getCurrentUser
}
