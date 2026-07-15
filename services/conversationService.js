const {sql} = require('../config/db')

async function getTextbookForConversation(maGT) {
    const request = new sql.Request()

    request.input('MAGT', sql.Int, maGT)

    const result = await request.query(`
        SELECT MAGT, NGUOIDANG, SOLUONG, TRANGTHAI
        FROM GIAOTRINH
        WHERE MAGT = @MAGT`)

    if (result.recordset.length === 0){
        const error = new Error('Không tìm thấy giáo trình!')
        error.status = 404
        throw error
    }
    return result.recordset[0]
}


function validateConversationAvailability(textbook, nguoiLienHe){
    if (textbook.NGUOIDANG === nguoiLienHe){
        const error = new Error('Bạn không thể liên hệ giáo trình của chính mình!')
        error.status = 403
        throw error
    }

    if (textbook.TRANGTHAI !== 'Đang hiển thị'){
        const error = new Error('Giáo trình hiện tại không thể liên hệ!')
        error.status = 409
        throw error
    }

    if (textbook.SOLUONG <= 0){
        const error = new Error('Giáo trình đã hết hàng!')
        error.status = 409
        throw error
    }
}


function normalizeParticipants(userA, userB){
    if (userA < userB){
        return {nguoi1: userA, nguoi2: userB}
    }

    return {nguoi1: userB, nguoi2: userA}
}


async function findConversation(transaction, maGT, nguoi1, nguoi2) {
    const request = new sql.Request(transaction)

    request.input('MAGT', sql.Int, maGT)
    request.input('NGUOI1', sql.Int, nguoi1)
    request.input('NGUOI2', sql.Int, nguoi2)

    const result = await request.query(`
        SELECT MACUOC, MAGT, MADH, NGUOI1, NGUOI2,
                TRANGTHAI, NGAYTAO, HOATDONGCUOI
        FROM CUOCTROCHUYEN
        WHERE MAGT = @MAGT
            AND NGUOI1 = @NGUOI1
            AND NGUOI2 = @NGUOI2`)

    if (result.recordset.length === 0){
        return null
    }

    return result.recordset[0]

}



async function insertConversation(transaction, maGT, maDH, nguoi1, nguoi2) {
    const request = new sql.Request(transaction)

    request.input('MAGT', sql.Int, maGT)
    request.input('MADH', sql.Int, maDH)
    request.input('NGUOI1', sql.Int, nguoi1)
    request.input('NGUOI2', sql.Int, nguoi2)

    const result = await request.query(`
        INSERT INTO CUOCTROCHUYEN (MAGT, MADH, NGUOI1, NGUOI2)
        OUTPUT INSERTED.MACUOC
        VALUES (@MAGT, @MADH, @NGUOI1, @NGUOI2)`)

    return result.recordset[0].MACUOC
}



async function attachOrderToConversation(transaction, maCuoc, maDH) {
    const request = new sql.Request(transaction)

    request.input('MACUOC', sql.BigInt, maCuoc)
    request.input('MADH', sql.Int, maDH)

    await request.query(`
        UPDATE CUOCTROCHUYEN
        SET MADH = @MADH,
        TRANGTHAI = N'Đang hoạt động',
        HOATDONGCUOI = SYSDATETIME()
        WHERE MACUOC = @MACUOC`)
}



async function createOrGetConversationForOrder(transaction, maGT, maDH, nguoiMua, nguoiBan) {
    const {nguoi1, nguoi2} = normalizeParticipants(nguoiMua, nguoiBan)
    const existingConversation = await findConversation(transaction, maGT, nguoi1, nguoi2)
    
    if (existingConversation){
        await attachOrderToConversation(transaction, existingConversation.MACUOC, maDH)
        return existingConversation.MACUOC
    }

    return insertConversation(transaction, maGT, maDH, nguoi1, nguoi2)
}


module.exports = {
    getTextbookForConversation,
    validateConversationAvailability, 
    normalizeParticipants,
    findConversation,
    insertConversation,
    attachOrderToConversation,
    createOrGetConversationForOrder
}