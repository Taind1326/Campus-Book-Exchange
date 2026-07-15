const {sql} = require('../config/db')

function validateOrder(textbook, nguoiMua, soLuong) {
    if (textbook.NGUOIDANG === nguoiMua){
        const error = new Error('Bạn không thể mua giáo trình của chính mình!')
        error.status = 403
        throw error
    }

    if (textbook.TRANGTHAI !== 'Đang hiển thị'){
        const error = new Error('Giáo trình hiện tại không thể giao dịch!')
        error.status = 409
        throw error
    }

    if (textbook.SOLUONG <= 0){
        const error = new Error('Giáo trình đã hết hàng!')
        error.status = 409
        throw error
    }

    if (soLuong > textbook.SOLUONG){
        const error = new Error(`Chỉ còn ${textbook.SOLUONG} giáo trình!`)
        error.status = 409
        throw error
    }
}



async function checkExistingActiveOrder(transaction, maGT, nguoiMua) {
    const request = new sql.Request(transaction)

    request.input('MAGT', sql.Int, maGT)
    request.input('NGUOIMUA', sql.Int, nguoiMua)

    const result = await request.query(`
        SELECT DH.MADH
        FROM DONHANG DH
        JOIN CHITIETDONHANG CT ON DH.MADH = CT.MADH
        WHERE CT.MAGT = @MAGT
            AND DH.NGUOIMUA = @NGUOIMUA
            AND DH.TRANGTHAI IN 
            (
                N'Đang trao đổi',
                N'Đã chốt'
            )`)

    if (result.recordset.length > 0){
        const error = new Error('Bạn đã có yêu cầu giao dịch cho giáo trình này!')
        error.status = 409
        throw error
    }
}


function getTransactionType(loaiTextbook){
    if (loaiTextbook === 'Bán'){
        return 'Mua'
    }

    if (loaiTextbook === 'Tặng'){
        return 'Nhận tặng'
    }

    if (loaiTextbook === 'Trao đổi'){
        return 'Trao đổi'
    }

    const error = new Error('Loại giao dịch không hợp lệ!')
    error.status = 400
    throw error
}


async function getTextbookForOrderWithLock(transaction, maGT) {
    const request = new sql.Request(transaction)

    request.input('MAGT', sql.Int, maGT)

    const result = await request.query(`
        SELECT MAGT, TENGT, MAHOCPHAN, NGUOIDANG,
                SOLUONG, DONGIA, LOAI, TRANGTHAI
        FROM GIAOTRINH WITH (UPDLOCK, HOLDLOCK)
        WHERE MAGT = @MAGT`)

    if (result.recordset.length === 0){
        const error = new Error('Không tìm thấy giáo trình!')
        error.status = 404
        throw error
    }
    return result.recordset[0]
}



async function insertOrder(transaction, textbook, nguoiMua) {
    const request = new sql.Request(transaction)

    request.input('NGUOIMUA', sql.Int, nguoiMua)
    request.input('NGUOIBAN', sql.Int, textbook.NGUOIDANG)
    request.input('LOAIGIAODICH', sql.NVarChar(50), getTransactionType(textbook.LOAI))

    const result = await request.query(`
        INSERT INTO DONHANG (NGUOIMUA, NGUOIBAN, LOAIGIAODICH)
        OUTPUT INSERTED.MADH
        VALUES (@NGUOIMUA, @NGUOIBAN, @LOAIGIAODICH)`)

    return result.recordset[0].MADH
}



async function insertOrderDetail(transaction, maDH, textbook, soLuong) {
    const request = new sql.Request(transaction)

    request.input('MADH', sql.Int, maDH)
    request.input('MAGT', sql.Int, textbook.MAGT)
    request.input('SOLUONG', sql.Int, soLuong)
    request.input('DONGIA', sql.Decimal(12, 0), textbook.DONGIA)

    await request.query(`
        INSERT INTO CHITIETDONHANG (MADH, MAGT, SOLUONG, DONGIA)
        VALUES (@MADH, @MAGT, @SOLUONG, @DONGIA)`)
}



module.exports = {
    validateOrder, 
    checkExistingActiveOrder, 
    getTransactionType,
    insertOrder,
    insertOrderDetail,
    getTextbookForOrderWithLock
}