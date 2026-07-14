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


async function insertTextbook(transaction, data, nguoiDang) {
    const request = new sql.Request(transaction)

    request.input('TENGT', sql.NVarChar(300), data.tenGT)
    request.input('SOLUONG', sql.Int, data.soLuong)
    request.input('DONGIA', sql.Decimal(12, 0),data.donGia)
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


async function getPublicTextbooks() {
    const result = await sql.query`
        SELECT MAGT, TENGT, TENMH, SOLUONG, DONGIA, LOAI, MOTA, TENTK, NGAYDANG, ANHDAIDIEN
        FROM V_GIAOTRINH_CONGKHAI
        ORDER BY NGAYDANG DESC`

    return result.recordset
}


module.exports = {getPublicTextbooks, createTextbook}
