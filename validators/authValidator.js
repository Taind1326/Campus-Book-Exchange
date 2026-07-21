function validationError(message) {
    const error = new Error(message)
    error.statusCode = 400
    return error
}


function normalizeEmail(value) {
    return value.trim().toLowerCase()
}


// Bước 1: Họ tên + MSSV + SĐT + email
function validateStudentInfo(data) {
    const {TENSV, MASV, SDT, EMAIL} = data

    if (typeof TENSV !== 'string' ||  typeof MASV !== 'string' || typeof SDT !== 'string' || typeof EMAIL !== 'string') {
        throw validationError('Dữ liệu đăng ký không hợp lệ!')
    }

    const student = {
        tenSV: TENSV.trim().replace(/\s+/g, ' '),
        maSV: MASV.trim(),
        soDienThoai: SDT.trim(),
        email: normalizeEmail(EMAIL)
    }

    if (!student.tenSV || !student.maSV || !student.soDienThoai || !student.email) {
        throw validationError('Vui lòng nhập đầy đủ họ tên, mã sinh viên, số điện thoại và email!')
    }

    if (!/^\d{6,30}$/.test(student.maSV)) {
        throw validationError('Mã sinh viên phải gồm từ 6 đến 30 chữ số!')
    }

    if (student.tenSV.length < 3 || student.tenSV.length > 300 || /\d/.test(student.tenSV)) {
        throw validationError('Họ tên phải từ 3 đến 300 ký tự và không được chứa số!')
    }

    if (!/^0\d{9}$/.test(student.soDienThoai)) {
        throw validationError('Số điện thoại phải có 10 chữ số và bắt đầu bằng số 0!')
    }

    if (student.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email)) {
        throw validationError('Email không hợp lệ!')
    }

    return student
}


// Bước 2: MSSV + OTP
function validateOtpRequest(data) {
    const {MASV, OTP} = data

    if (typeof MASV !== 'string' || typeof OTP !== 'string') {
        throw validationError('Dữ liệu xác minh không hợp lệ!')
    }

    const maSV = MASV.trim()
    const otp = OTP.trim()

    if (!/^\d{6,30}$/.test(maSV)) {
        throw validationError('Mã sinh viên không hợp lệ!')
    }

    if (!/^\d{6}$/.test(otp)) {
        throw validationError('OTP phải gồm đúng 6 chữ số!')
    }

    return {maSV, otp}
}


// Gửi lại OTP
function validateResendRequest(data) {
    const {MASV, EMAIL} = data

    if (typeof MASV !== 'string' || typeof EMAIL !== 'string') {
        throw validationError('Dữ liệu gửi lại OTP không hợp lệ!')
    }

    const maSV = MASV.trim()
    const email = normalizeEmail(EMAIL)

    if (!/^\d{6,30}$/.test(maSV)) {
        throw validationError('Mã sinh viên không hợp lệ!')
    }

    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw validationError('Email không hợp lệ!')
    }

    return {maSV, email}
}


// Bước 3: Tên tài khoản + mật khẩu + xác nhận mật khẩu
function validateAccountInfo(data) {
    const {
        REGISTRATION_TOKEN,
        TENTK,
        MATKHAU,
        XACNHANMATKHAU
    } = data

    if (typeof REGISTRATION_TOKEN !== 'string' || typeof TENTK !== 'string' || typeof MATKHAU !== 'string' || typeof XACNHANMATKHAU !== 'string') {
        throw validationError('Dữ liệu tạo tài khoản không hợp lệ!')
    }

    const registrationToken = REGISTRATION_TOKEN.trim()
    const tenTaiKhoan = TENTK.trim().toLowerCase()

    if (!registrationToken) {
        throw validationError('Phiên tạo tài khoản không hợp lệ!')
    }

    if (tenTaiKhoan.length < 3 || tenTaiKhoan.length > 50 || /\s/.test(tenTaiKhoan)) {
        throw validationError('Tên tài khoản phải từ 3 đến 50 ký tự và không có khoảng trắng!')
    }

    if (MATKHAU.length < 6 || MATKHAU.trim().length < 6) {
        throw validationError('Mật khẩu phải có ít nhất 6 ký tự và không được chỉ chứa khoảng trắng!')
    }

    if (MATKHAU !== XACNHANMATKHAU) {
        throw validationError('Xác nhận mật khẩu không khớp!')
    }

    return {
        registrationToken,
        tenTaiKhoan,
        matKhau: MATKHAU
    }
}


module.exports = {
    validateStudentInfo,
    validateOtpRequest,
    validateResendRequest,
    validateAccountInfo
}