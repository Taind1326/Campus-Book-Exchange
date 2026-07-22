const {sql} = require('../config/db')


function createRequest(transaction = null) {
    if (transaction) {
        return new sql.Request(transaction)
    }

    return new sql.Request()
}


// Kiểm tra trùng MSSV, số điện thoại và email
async function getRegistrationConflicts(transaction, maSV, soDienThoai, email) {
    const request = createRequest(transaction)

    request.input('MASV', sql.VarChar(30), maSV)
    request.input('SDT', sql.VarChar(10), soDienThoai)
    request.input('EMAIL', sql.VarChar(254), email)

    const result = await request.query(`
        SELECT CASE WHEN EXISTS (SELECT 1
                                 FROM SINHVIEN WITH (UPDLOCK, HOLDLOCK)
                                 WHERE MASV = @MASV)
                THEN 1 ELSE 0
                END AS MASV_TONTAI,

                CASE WHEN EXISTS (SELECT 1
                                  FROM SINHVIEN WITH (UPDLOCK, HOLDLOCK)
                                  WHERE SDT = @SDT)
                THEN 1 ELSE 0
                END AS SDT_TONTAI,

                CASE WHEN EXISTS (SELECT 1
                                  FROM SINHVIEN WITH (UPDLOCK, HOLDLOCK)
                                  WHERE EMAIL = @EMAIL)
                THEN 1 ELSE 0
                END AS EMAIL_TONTAI`)

    return result.recordset[0]
}


// Tạo hồ sơ sinh viên ở bước 1, chưa tạo tài khoản
async function insertStudent(transaction, maSV, tenSV, soDienThoai, email) {
    const request = createRequest(transaction)

    request.input('MASV', sql.VarChar(30), maSV)
    request.input('EMAIL', sql.VarChar(254), email)
    request.input('TENSV', sql.NVarChar(300), tenSV)
    request.input('SDT', sql.VarChar(10), soDienThoai)

    await request.query(`
        INSERT INTO SINHVIEN (MASV, EMAIL, TENSV, SDT)
        VALUES (@MASV, @EMAIL, @TENSV, @SDT)`)
}


// Làm hết hiệu lực OTP cũ trước khi gửi lại
async function expireActiveOtps(transaction, maSV) {
    const request = createRequest(transaction)

    request.input('MASV', sql.VarChar(30), maSV)

    await request.query(`
        UPDATE XACMINHEMAIL
        SET TRANGTHAI = N'Hết hạn'
        WHERE MASV = @MASV
            AND TRANGTHAI = N'Còn hiệu lực'`)
}


// Lưu hash OTP mới
async function insertEmailOtp(transaction, maSV, otpHash) {
    const request = createRequest(transaction)

    request.input('MASV', sql.VarChar(30), maSV)
    request.input('MAOTP_HASH', sql.VarChar(255),otpHash)

    await request.query(`
        INSERT INTO XACMINHEMAIL (MASV, MAOTP_HASH, HETHAN)
        VALUES (@MASV, @MAOTP_HASH, DATEADD(MINUTE, 10, SYSDATETIME()))`)
}


// Lấy OTP còn hiệu lực mới nhất
async function getLatestActiveOtp(maSV) {
    const request = createRequest()

    request.input('MASV', sql.VarChar(30), maSV)

    const result = await request.query(`
        SELECT TOP (1) MAXACMINH, MASV, MAOTP_HASH, SOLANSAI, NGAYGUI, HETHAN,
                DATEDIFF(SECOND, NGAYGUI, SYSDATETIME()) AS SOGIAYTULANGUI,

                CASE WHEN HETHAN > SYSDATETIME()
                    THEN 1 ELSE 0
                END AS CONHIEULUC

        FROM XACMINHEMAIL
        WHERE MASV = @MASV
            AND TRANGTHAI = N'Còn hiệu lực'

        ORDER BY NGAYGUI DESC`)

    return result.recordset[0] || null
}


// Lấy hồ sơ đăng ký của sinh viên
async function getStudentRegistration(maSV, email = null) {
    const request = createRequest()

    request.input('MASV', sql.VarChar(30), maSV)
    request.input('EMAIL', sql.VarChar(254), email)

    const result = await request.query(`
        SELECT SV.MASV, SV.EMAIL, SV.TENSV, SV.NGAYXACMINHEMAIL,
        CASE WHEN TK.MATK IS NULL 
        THEN 0 ELSE 1
        END AS COTAIKHOAN

        FROM SINHVIEN SV

        LEFT JOIN TAIKHOAN TK ON TK.MASV = SV.MASV

        WHERE SV.MASV = @MASV
            AND (
                    @EMAIL IS NULL
                    OR SV.EMAIL = @EMAIL
                )`)

    return result.recordset[0] || null
}


// Đếm số OTP đã gửi trong 24 giờ
async function countOtpsLast24Hours(maSV) {
    const request = createRequest()

    request.input('MASV', sql.VarChar(30), maSV)

    const result = await request.query(`
        SELECT COUNT(*) AS SOLAN
        FROM XACMINHEMAIL
        WHERE MASV = @MASV
            AND NGAYGUI >= DATEADD 
            (
                HOUR,
                -24,
                SYSDATETIME()
            )`)

    return result.recordset[0].SOLAN
}


// Ghi nhận một lần nhập OTP sai
async function recordWrongOtp(maXacMinh) {
    const request = createRequest()

    request.input('MAXACMINH', sql.BigInt, maXacMinh)

    await request.query(`
        UPDATE XACMINHEMAIL
        SET SOLANSAI = SOLANSAI + 1,
        TRANGTHAI = CASE WHEN SOLANSAI + 1 >= 5
                        THEN N'Đã khóa'
                        ELSE TRANGTHAI
                    END

        WHERE MAXACMINH = @MAXACMINH
            AND TRANGTHAI = N'Còn hiệu lực'`)
}


// Đánh dấu OTP và email đã được xác minh
async function markEmailVerified(transaction, maXacMinh, maSV) {
    const otpRequest = createRequest(transaction)

    otpRequest.input('MAXACMINH', sql.BigInt, maXacMinh)

    const otpResult = await otpRequest.query(`
        UPDATE XACMINHEMAIL
        SET TRANGTHAI = N'Đã xác minh',
            NGAYXACMINH = SYSDATETIME()

        WHERE MAXACMINH = @MAXACMINH
            AND TRANGTHAI = N'Còn hiệu lực'
            AND HETHAN > SYSDATETIME()`)

    // Không có dòng nào được cập nhật:
    // OTP đã dùng, bị khóa hoặc hết hạn
    if (otpResult.rowsAffected[0] !== 1) {
        return false
    }

    const studentRequest = createRequest(transaction)

    studentRequest.input('MASV', sql.VarChar(30), maSV)

    await studentRequest.query(`
        UPDATE SINHVIEN
        SET NGAYXACMINHEMAIL = SYSDATETIME()
        WHERE MASV = @MASV`)

    return true
}


// Tạo tài khoản sau khi email đã được xác minh
async function insertAccount(transaction, maSV, tenTaiKhoan, matKhauHash) {
    const request = createRequest(transaction)

    request.input('MASV', sql.VarChar(30), maSV)
    request.input('TENTK', sql.VarChar(50), tenTaiKhoan)
    request.input('MATKHAU_HASH', sql.VarChar(255), matKhauHash)

    const result = await request.query(`
        IF NOT EXISTS (SELECT 1
                        FROM SINHVIEN WITH (UPDLOCK, HOLDLOCK)
                        WHERE MASV = @MASV
                        AND NGAYXACMINHEMAIL IS NOT NULL)

            BEGIN
                THROW 50001, N'Email chưa được xác minh.', 1;
            END


        IF EXISTS (SELECT 1
                    FROM TAIKHOAN WITH (UPDLOCK, HOLDLOCK)
                    WHERE MASV = @MASV)

            BEGIN
                THROW 50002, N'Hồ sơ sinh viên đã có tài khoản.', 1;
            END

        IF EXISTS (SELECT 1
                    FROM TAIKHOAN WITH (UPDLOCK, HOLDLOCK)
                    WHERE TENTK = @TENTK)

            BEGIN
                THROW 50003, N'Tên tài khoản đã tồn tại.', 1;
            END


        INSERT INTO TAIKHOAN (TENTK, MATKHAU_HASH, MASV)

        OUTPUT INSERTED.MATK, INSERTED.TENTK, INSERTED.MASV, INSERTED.VAITRO, INSERTED.TRANGTHAI

        VALUES (@TENTK, @MATKHAU_HASH, @MASV)`)

    return result.recordset[0]
}

module.exports = {
    getRegistrationConflicts,
    insertStudent,
    expireActiveOtps,
    insertEmailOtp,
    getLatestActiveOtp,
    getStudentRegistration,
    countOtpsLast24Hours,
    recordWrongOtp,
    markEmailVerified,
    insertAccount
}