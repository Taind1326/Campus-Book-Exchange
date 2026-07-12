const bcrypt = require('bcrypt')
const {sql} = require('../config/db')

const SALT_ROUNDS = 10

async function register(req, res) {
    const {MASV, TENSV, SDT, TENTK, MATKHAU} = req.body

    if (!MASV || !TENSV || !SDT || !TENTK || !MATKHAU){
        return res.status(400).json({message: 'Vui lòng nhập đầy đủ thông tin!'})
    }

    if (typeof MASV !== 'string' || typeof TENSV !== 'string' || typeof SDT !== 'string' || typeof TENTK !== 'string' || typeof MATKHAU !== 'string') {
        return res.status(400).json({message: 'Dữ liệu đăng ký không hợp lệ!'})
    }


    const maSV = MASV.trim()
    const tenSV = TENSV.trim()
    const soDienThoai = SDT.trim()
    const tenTaiKhoan = TENTK.trim().toLowerCase()

    if (!/^\d{6,30}$/.test(maSV)){
        return res.status(400).json({message: 'Mã sinh viên không hợp lệ!'})
    }

    if (tenSV.length < 3 || /\d/.test(tenSV)){
        return res.status(400).json({message: 'Họ tên không được chứa số!'})
    }

    if (!/^0\d{9}$/.test(soDienThoai)){
        return res.status(400).json({message: 'Số điện thoại phải đủ 10 chữ số và phải bắt đầu bằng số 0!'})
    }

    if (tenTaiKhoan.length < 3 || tenTaiKhoan.length > 50 || /\s/.test(tenTaiKhoan)){
        return res.status(400).json({message: 'Tên tài khoản phải từ 3 đến 50 ký tự và không có khoảng trắng!'})
    }

    if (MATKHAU.length < 6){
        return res.status(400).json({message: 'Mật khẩu phải có ít nhất 6 ký tự!'})
    }

    try {
        const existingResult = await sql.query`
            SELECT 
            CASE WHEN EXISTS (SELECT 1 FROM SINHVIEN WHERE MASV = ${maSV})
            THEN 1 ELSE 0 END AS MASV_TONTAI,
            
            CASE WHEN EXISTS (SELECT 1 FROM SINHVIEN WHERE SDT = ${soDienThoai})
            THEN 1 ELSE 0 END AS SDT_TONTAI,
            
            CASE WHEN EXISTS (SELECT 1 FROM TAIKHOAN WHERE TENTK = ${tenTaiKhoan})
            THEN 1 ELSE 0 END AS TENTK_TONTAI`

            const existingData = existingResult.recordset[0]

            if (existingData.MASV_TONTAI === 1){
                return res.status(409).json({message: 'Mã sinh viên đã được đăng ký!'})
            }

            if (existingData.SDT_TONTAI === 1){
                return res.status(409).json({message: 'Số điện thoại đã được sử dụng!'})
            }

            if (existingData.TENTK_TONTAI === 1){
                return res.status(409).json({message: 'Tên tài khoản đã tồn tại!'})
            }

            const matKhauHash = await bcrypt.hash(MATKHAU, SALT_ROUNDS)

            const transaction = new sql.Transaction()
            let transactionStarted = false

            try {
                await transaction.begin()

                transactionStarted = true

                const request = new sql.Request(transaction)

                request.input('MASV', sql.VarChar(30), maSV)
                request.input('TENSV', sql.NVarChar(300), tenSV)
                request.input('SDT', sql.VarChar(10), soDienThoai)
                request.input('TENTK', sql.VarChar(50), tenTaiKhoan)
                request.input('MATKHAU_HASH', sql.VarChar(255), matKhauHash)

                await request.query(`INSERT INTO SINHVIEN(MASV, TENSV, SDT)
                                     VALUES (@MASV, @TENSV, @SDT);
                                     
                                     INSERT INTO TAIKHOAN(TENTK, MATKHAU_HASH, MASV)
                                     VALUES (@TENTK, @MATKHAU_HASH, @MASV);`)

                await transaction.commit()

                return res.status(201).json({message: 'Đăng ký tài khoản thành công!'})
            }

            catch(error){
                if (transactionStarted){
                    await transaction.rollback()
                }
                throw error
            }
    }

    catch(error){
        console.log('Lỗi đăng ký: ',error)

        if (error.number === 2601 || error.number === 2627){
            return res.status(409).json({message: 'Mã sinh viên, số điện thoại hoặc tên tài khoản đã tồn tại!'})
        }

        return res.status(500).json({message: 'Không thể đăng ký tài khoản!'})
    }
}


module.exports = {register}