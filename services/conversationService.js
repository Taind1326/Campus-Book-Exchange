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




module.exports = {getTextbookForConversation, validateConversationAvailability, normalizeParticipants}