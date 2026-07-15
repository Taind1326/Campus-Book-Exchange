const {sql} = require('../config/db')
const {uploadImages, deleteImages} = require('../utils/cloudinaryUpload')

async function checkCourseExists(maHocPhan) {
    const request = new sql.Request()

    request.input('MAHOCPHAN', sql.VarChar(20), maHocPhan)

    const result = await request.query(`
        SELECT MAHOCPHAN
        FROM MONHOC
        WHERE MAHOCPHAN = @MAHOCPHAN`)

    return result.recordset.length > 0
}


async function checkUpdatePermission(maGT, nguoiDang) {
    const request = new sql.Request()

    request.input('MAGT', sql.Int, maGT)

    const result = await request.query(`
        SELECT NGUOIDANG, TRANGTHAI
        FROM GIAOTRINH
        WHERE MAGT = @MAGT`)

    if (result.recordset.length === 0){
        const error = new Error('Không tìm thấy giáo trình!')
        error.status = 404
        throw error
    }

    const textbook = result.recordset[0]

    if (textbook.NGUOIDANG !== nguoiDang){
        const error = new Error('Bạn không có quyền chỉnh sửa giáo trình này!')
        error.status = 403
        throw error 
    }

    if (textbook.TRANGTHAI === 'Đang giao dịch'){
        const error = new Error('Không thể chỉnh sửa giáo trình đang giao dịch!')
        error.status = 409
        throw error
    }
    
    if (textbook.TRANGTHAI === 'Đã xóa'){
        const error = new Error('Không thể chỉnh sửa giáo trình đã xóa!')
        error.status = 409
        throw error
    }
}


async function insertTextbook(transaction, data, nguoiDang) {
    const request = new sql.Request(transaction)

    request.input('TENGT', sql.NVarChar(300), data.tenGT)
    request.input('SOLUONG', sql.Int, data.soLuong)
    request.input('DONGIA', sql.Decimal(12, 0), data.donGia)
    request.input('HOCKY', sql.Int, data.hocKy)
    request.input('MAHOCPHAN', sql.VarChar(20), data.maHocPhan)
    request.input('MOTA', sql.NVarChar(sql.MAX), data.moTa)
    request.input('LOAI', sql.NVarChar(50), data.loai)
    request.input('NGUOIDANG', sql.Int, nguoiDang)

    const result = await request.query(`
        INSERT INTO GIAOTRINH (TENGT, SOLUONG, DONGIA, HOCKY, MAHOCPHAN, MOTA, LOAI, NGUOIDANG)
        OUTPUT INSERTED.MAGT 
        VALUES (@TENGT, @SOLUONG, @DONGIA, @HOCKY, @MAHOCPHAN, @MOTA, @LOAI, @NGUOIDANG)`)

    return result.recordset[0].MAGT
}


async function insertTextbookImages(transaction, maGT, images) {
    for (const image of images){
        const request = new sql.Request(transaction)

        request.input('MAGT', sql.Int, maGT)
        request.input('DUONGDAN', sql.NVarChar(500), image.DUONGDAN)
        request.input('PUBLIC_ID', sql.NVarChar(300), image.PUBLIC_ID)
        request.input('THUTU', sql.Int, image.THUTU)

        await request.query(`
            INSERT INTO HINHANHGIAOTRINH (MAGT, DUONGDAN, PUBLIC_ID, THUTU)
            VALUES (@MAGT, @DUONGDAN, @PUBLIC_ID, @THUTU)`)
    }
}


async function createTextbook(data, files, nguoiDang) {
    const courseExists = await checkCourseExists(data.maHocPhan)

    if (!courseExists){
        const error = new Error('Mã học phần không tồn tại!')

        error.status = 404
        throw error
    }

    const uploadedImages = await uploadImages(files)
    const transaction = new sql.Transaction()

    let transactionStarted = false

    try {
        await transaction.begin()
        transactionStarted = true

        const maGT = await insertTextbook(transaction, data, nguoiDang)

        await insertTextbookImages(transaction, maGT, uploadedImages)

        await transaction.commit()
        transactionStarted = false

        return {maGT, uploadedImages}
    }

    catch(error){
        if (transactionStarted){
            try{
                await transaction.rollback()
            }

            catch(rollbackError){
                console.log('Lỗi rollback SQL: ', rollbackError)
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

        throw error
    }
}



async function updateTextbook(maGT, data, nguoiDang) {
    await checkUpdatePermission(maGT, nguoiDang)

    const courseExists = await checkCourseExists(data.maHocPhan)

    if (!courseExists){
        const error = new Error('Mã học phần không tồn tại!')

        error.status = 404
        throw error
    }

    const request = new sql.Request()

    request.input('MAGT', sql.Int, maGT)
    request.input('NGUOIDANG', sql.Int, nguoiDang)
    request.input('TENGT', sql.NVarChar(300), data.tenGT)
    request.input('SOLUONG', sql.Int, data.soLuong)
    request.input('DONGIA', sql.Decimal(12, 0), data.donGia)
    request.input('HOCKY', sql.Int, data.hocKy)
    request.input('MAHOCPHAN', sql.VarChar(20), data.maHocPhan)
    request.input('MOTA', sql.NVarChar(sql.MAX), data.moTa)
    request.input('LOAI', sql.NVarChar(50), data.loai)

    const result =  await request.query(`
        UPDATE GIAOTRINH
        SET TENGT = @TENGT,
            SOLUONG = @SOLUONG,
            DONGIA = @DONGIA,
            HOCKY = @HOCKY,
            MAHOCPHAN = @MAHOCPHAN,
            MOTA = @MOTA,
            LOAI = @LOAI,
            TRANGTHAI = CASE
                            WHEN @SOLUONG = 0 THEN N'Hết hàng'
                            WHEN TRANGTHAI = N'Hết hàng' THEN N'Đang hiển thị'
                            ELSE TRANGTHAI
                        END,
            NGAYCAPNHAT = SYSDATETIME()
            WHERE MAGT = @MAGT
            AND NGUOIDANG = @NGUOIDANG
            AND TRANGTHAI NOT IN 
            (
                N'Đang giao dịch',
                N'Đã xóa'
            )
        `)
    
    if (result.rowsAffected[0] === 0){
        const error = new Error('Không thể cập nhật giáo trình!')
        error.status = 409
        throw error
    }

    return true
}


async function deleteTextbook(maGT, nguoiDang) {
    await checkUpdatePermission(maGT, nguoiDang)
    const request = new sql.Request()

    request.input('MAGT', sql.Int, maGT)
    request.input('NGUOIDANG', sql.Int, nguoiDang)

    const result = await request.query(`
        UPDATE GIAOTRINH
        SET TRANGTHAI = N'Đã xóa',
        NGAYCAPNHAT = SYSDATETIME()
        WHERE MAGT = @MAGT
            AND NGUOIDANG = @NGUOIDANG
            AND TRANGTHAI NOT IN
            (
                N'Đang giao dịch',
                N'Đã xóa'
            )`)

    if (result.rowsAffected[0] === 0){
        const error = new Error('Không thể xóa giáo trình!')
        error.status = 409
        throw error
    }
    return true
}


async function getPublicTextbooks() {
    const result = await sql.query`
        SELECT MAGT, TENGT, TENMH, SOLUONG, DONGIA, LOAI, MOTA, TENTK, NGAYDANG, ANHDAIDIEN
        FROM V_GIAOTRINH_CONGKHAI
        ORDER BY NGAYDANG DESC`

    return result.recordset
}


async function getTextbookById(maGT) {
    const textbookRequest = new sql.Request()

    textbookRequest.input('MAGT', sql.Int, maGT)

    const textbookResult = await textbookRequest.query(`
        SELECT GT.MAGT, GT.TENGT, GT.SOLUONG, GT.DONGIA, GT.HOCKY,
                GT.MOTA, GT.LOAI, GT.TRANGTHAI, GT.NGAYDANG,
                MH.TENMH, TK.TENTK
                
        FROM GIAOTRINH GT
        JOIN MONHOC MH ON GT.MAHOCPHAN = MH.MAHOCPHAN
        JOIN TAIKHOAN TK ON GT.NGUOIDANG = TK.MATK
        WHERE GT.MAGT = @MAGT
        AND GT.TRANGTHAI = N'Đang hiển thị'`)

    if (textbookResult.recordset.length === 0){
        return null
    }

    const imageRequest = new sql.Request()

    imageRequest.input('MAGT', sql.Int, maGT)

    const imageResult = await imageRequest.query(`
        SELECT DUONGDAN, THUTU
        FROM HINHANHGIAOTRINH
        WHERE MAGT = @MAGT
        ORDER BY THUTU ASC`)

    const textbook = textbookResult.recordset[0]

    textbook.HINHANH = imageResult.recordset

    return textbook
}



async function getMyTextbooks(nguoiDang) {
    const request = new sql.Request()

    request.input('NGUOIDANG', sql.Int, nguoiDang)

    const result = await request.query(`
        SELECT GT.MAGT, GT.TENGT, MH.TENMH, GT.SOLUONG, GT.DONGIA,
                GT.LOAI, GT.TRANGTHAI, GT.NGAYDANG, HA.DUONGDAN AS ANHDAIDIEN
                
        FROM GIAOTRINH GT
        JOIN MONHOC MH ON GT.MAHOCPHAN = MH.MAHOCPHAN
        OUTER APPLY (SELECT TOP (1) H.DUONGDAN
                    FROM HINHANHGIAOTRINH H
                    WHERE H.MAGT = GT.MAGT
                    ORDER BY H.THUTU ASC ) HA
        WHERE GT.NGUOIDANG = @NGUOIDANG
            AND GT.TRANGTHAI <> N'Đã xóa'
        ORDER BY GT.NGAYDANG DESC`)

    return result.recordset
}


module.exports = {
    getPublicTextbooks, 
    getTextbookById, 
    getMyTextbooks, 
    createTextbook, 
    updateTextbook,
    deleteTextbook
}
