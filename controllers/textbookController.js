const {sql} = require('../config/db')
const {uploadImages, deleteImages} = require('../utils/cloudinaryUpload')


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
    console.log('BODY:', req.body)
console.log('FILES:', req.files)
    const {TENGT, SOLUONG, DONGIA, HOCKY, MAHOCPHAN, MOTA, LOAI} = req.body;

    if (req.user.TRANGTHAI === 'Bị hạn chế'){
        return res.status(403).json({message: 'Tài khoản bị hạn chế, không thể đăng giáo trình!'})
    }

    if (TENGT === undefined || SOLUONG === undefined || DONGIA === undefined || HOCKY === undefined || MAHOCPHAN === undefined || LOAI === undefined){
        return res.status(400).json({message: "Vui lòng nhập đầy đủ thông tin!"})
    }

    if (typeof TENGT !== 'string' || typeof SOLUONG !== 'string' || typeof DONGIA !== 'string' || typeof HOCKY !== 'string' || typeof MAHOCPHAN !== 'string' || typeof LOAI !== 'string' || (MOTA !== undefined && typeof MOTA !== 'string')){
        return res.status(400).json({message: 'Dữ liệu giáo trình không hợp lệ!'})
    }

    const tenGT = TENGT.trim()
    const maHocPhan = MAHOCPHAN.trim()
    const loai = LOAI.trim()
    const moTa = MOTA?.trim() || null

    const soLuong = Number(SOLUONG)
    const donGia = Number(DONGIA)
    const hocKy = Number(HOCKY)

    if (tenGT.length < 3){
        return res.status(400).json({message: 'Tên giáo trình phải có ít nhất 3 ký tự!'})
    }

    if (!Number.isInteger(soLuong) || soLuong <= 0){
        return res.status(400).json({message: 'Số lượng là số nguyên lớn hơn 0!'})
    }

    if (!Number.isFinite(donGia) || donGia < 0){
        return res.status(400).json({message: 'Đơn giá không hợp lệ!'})
    }

    if (!Number.isInteger(hocKy) || hocKy < 1 || hocKy > 12){
        return res.status(400).json({message: 'Học kỳ phải từ 1 đến 12'})
    }

    if (!/^\d{6,20}$/.test(maHocPhan)){
        return res.status(400).json({message: 'Mã học phần không hợp lệ!'})
    }

    const danhSachLoai = ['Bán', 'Tặng', 'Trao đổi']

    if (!danhSachLoai.includes(loai)){
        return res.status(400).json({message: 'Loại giáo trình không hợp lệ!'})
    }

    if (loai === 'Bán' && donGia <= 0){
        return res.status(400).json({message: 'Giá bán phải lớn hơn 0!'})
    }

    if (['Tặng', 'Trao đổi'].includes(loai) && donGia !== 0){
        return res.status(400).json({message: 'Giá của giáo trình tặng hoặc trao đổi phải bằng 0!'})
    }

    if (!req.files || req.files.length === 0){
        return res.status(400).json({message: 'Vui lòng chọn ít nhất 1 hình ảnh!'})
    }

    const nguoiDang = req.user.MATK
    const transaction = new sql.Transaction()

    let transactionStarted = false
    let uploadedImages = []

    try {
        const courseRequest = new sql.Request()

        courseRequest.input('MAHOCPHAN', sql.VarChar(20), maHocPhan)

        const courseResult = await courseRequest.query(`SELECT MAHOCPHAN FROM MONHOC WHERE MAHOCPHAN = @MAHOCPHAN`)

        if (courseResult.recordset.length === 0){
            return res.status(404).json({message: 'Mã học phần không tồn tại!'})
        }

        uploadedImages = await uploadImages(req.files)

        await transaction.begin()
        transactionStarted = true

        const textbookRequest = new sql.Request(transaction)

        textbookRequest.input('TENGT', sql.NVarChar(300), tenGT)
        textbookRequest.input('SOLUONG', sql.Int, soLuong)
        textbookRequest.input('DONGIA', sql.Decimal(12, 0), donGia)
        textbookRequest.input('HOCKY', sql.Int, hocKy)
        textbookRequest.input('MAHOCPHAN', sql.VarChar(20), maHocPhan)
        textbookRequest.input('MOTA', sql.NVarChar(sql.MAX), moTa)
        textbookRequest.input('LOAI', sql.NVarChar(50), loai)
        textbookRequest.input('NGUOIDANG', sql.Int, nguoiDang)

        const textbookResult = await textbookRequest.query(`
            INSERT INTO GIAOTRINH (TENGT, SOLUONG, DONGIA, HOCKY, MAHOCPHAN, MOTA, LOAI, NGUOIDANG)
            OUTPUT INSERTED.MAGT 
            VALUES (@TENGT, @SOLUONG, @DONGIA, @HOCKY, @MAHOCPHAN, @MOTA, @LOAI, @NGUOIDANG)`)

        const maGT = textbookResult.recordset[0].MAGT

        for (const image of uploadedImages){
            const imageRequest = new sql.Request(transaction)

            imageRequest.input('MAGT', sql.Int, maGT)
            imageRequest.input('DUONGDAN', sql.NVarChar(500), image.DUONGDAN)
            imageRequest.input('PUBLIC_ID', sql.NVarChar(300), image.PUBLIC_ID)
            imageRequest.input('THUTU', sql.Int, image.THUTU)

            await imageRequest.query(`
                INSERT INTO HINHANHGIAOTRINH (MAGT, DUONGDAN, PUBLIC_ID, THUTU)
                VALUES (@MAGT, @DUONGDAN, @PUBLIC_ID, @THUTU)`)
        }

        await transaction.commit()
        transactionStarted = false

        return res.status(201).json({message: 'Đăng tải giáo trình thành công!', textbook: {
            MAGT: maGT,
            TENGT: tenGT,
            MAHOCPHAN: maHocPhan,
            HINHANH: uploadedImages
        }
    })
    }

    catch(error){
        if (transactionStarted){
            try {
                await transaction.rollback()
            }

            catch(rollbackError){
                console.log('Lỗi rollback SQL: ',rollbackError)
            }
        }

        if (uploadedImages.length > 0){
            try {
                const publicIds = uploadedImages.map(image => image.PUBLIC_ID)
                await deleteImages(publicIds)
            }

            catch(deleteError){
                console.log('Lỗi xóa ảnh Cloudinary: ', deleteError)
            }
        }

        console.log('Lỗi đăng giáo trình: ', error)

        return res.status(500).json({message: 'Không thể đăng tải giáo trình!'})
    }

    

}


module.exports = {getAllTextbooks, createTextbook}