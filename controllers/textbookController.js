const {sql} = require('../config/db')

async function getAllTextbooks(req, res) {
    try{
        const result = await sql.query`SELECT*
                                        FROM GIAOTRINH
                                        ORDER BY NGAYDANG DESC`
        res.json(result.recordset)
    }

    catch(error){
        console.log(error)
        res.status(500).json({message:'Loi lay danh sach giao trinh'})
    }
}


async function createTextbook(req, res) {
    const {TENGT, SOLUONG, DONGIA, HOCKY, MAMH, MOTA, LOAI, TRANGTHAI} = req.body;

    if (req.user.TRANGTHAI === 'Bị hạn chế'){
        return res.status(403).json({message: 'Tài khoản bị hạn chế, không thể đăng giáo trình!'})
    }

    if (!TENGT || SOLUONG === undefined || DONGIA === undefined || HOCKY === undefined|| !MAMH || !LOAI){
        return res.status(400).json({message: "Vui lòng nhập đầy đủ thông tin!"})
    }

    if (typeof TENGT === 'string' || Number.isInteger(SOLUONG) || typeof DONGIA === 'number' || Number.isInteger(HOCKY)){
        return res.status(403).json({message: 'Dữ liệu giáo trình không hợp lệ!'})
    }

    const tenGT = TENGT.trim()
    const soLuong = SOLUONG.trim()
    const donGia = DONGIA.trim()
    const hocKy = HOCKY.trim()
    const maMH = MAMH.trim()
    const moTa = MOTA.trim()
    const loai = LOAI.trim()

    if (tenGT.length < 4){
        return res.status(400).json({message: 'Tên giáo trình phải có ít nhất 4 ký tự!'})
    }

    if (!Number.isInteger(hocKy) || hocKy < 1 || hocKy > 12){
        return res.status(400).json({message: 'Học kỳ phải từ 1 đến 12'})
    }

    if (soLuong <= 0){
        return res.status(400).json({message: "Số lượng phải lớn hơn 0"})
    }

    if(!['Bán', 'Tặng', 'Trao đổi'].includes(loai)){
        return res.status(400).json({message: "Loại giáo trình không hợp  lệ!"})
    }

    if (loai == 'Bán' && donGia <= 0){
        return res.status(400).json({message: 'Giá bán phải lớn hơn 0!'})
    }

    if (['Tặng', 'Trao đổi'].includes(loai)){
        return res.status(400).json({message: 'Giá của giáo trình trao đổi hoặc tặng phải bằng 0'})
    }

    const transaction = new sql.Transaction()
    let transactionStarted = false

    try {
        await transaction.begin()

        transactionStarted = true

        const request = sql.Request(transaction)

        request.input('TENGT', sql.NVarChar(300), tenGT)
        request.input('SOLUONG', sql.Int, soLuong)
        request.input('DONGIA', sql.Decimal(10, 2), donGia)
        request.input('HOCKY', sql.Int, hocKy)
        request.input('MAMH', sql.Int, maMH)
        request.input('MOTA', sql.NVarChar(MAX), moTa)
        request.input('LOAI', sql.NVarChar(50), loai)
        request.input('TRANGTHAI', sql.NVarChar(50), TINHTRANG)

        await request.query(`INSERT INTO GIAOTRINH(TENGT, SOLUONG, DONGIA, HOCKY, MAMH, MOTA, LOAI, TRANGTHAI)
                            VALUES(@TENGT, @SOLUONG, @DONGIA, @HOCKY, @MAMH, @MOTA, @LOAI, T@RANGTHAI)`)

        await transaction.commit()

        res.status(201).json({message: 'Đăng tải giáo trình thành công!'})
    }

    catch(error){
        if (transactionStarted){
                    await transaction.rollback()
                }
                throw error
    }

    

}


module.exports = {getAllTextbooks, createTextbook}