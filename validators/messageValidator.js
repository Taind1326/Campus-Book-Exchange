function validateCreateMessage(body){
    const {MACUOC, NOIDUNG} = body

    if (MACUOC === undefined){
        return {isValid: false, status: 400, message: 'Thiếu mã cuộc trò chuyện!'}
    }

    if (NOIDUNG === undefined){
        return {isValid: false, status: 400, message: 'Thiếu nội dung tin nhắn!'}
    }

    if (typeof NOIDUNG !== 'string'){
        return {isValid: false, status: 400, message: 'Nội dung tin nhắn không hợp lệ!'}
    }

    const data = {maCuoc: Number(MACUOC), noiDung: NOIDUNG.trim()}

    if (!Number.isInteger(data.maCuoc) || data.maCuoc <= 0){
        return {isValid: false, status: 400, message: 'Mã cuộc trò chuyện không hợp lệ!'}
    }

    if (data.noiDung.length === 0){
        return {isValid: false, status: 400, message: 'Nội dung tin nhắn không được để trống!'}
    }

    if(data.noiDung.length > 5000){
        return {isValid: false, status: 400, message: 'Nội dung tin nhắn không được vượt quá 5000 ký tự!'}
    }

    return {isValid: true, data}
}


function validateConversationId(id){
     const maCuoc = Number(id)

    if (!Number.isInteger(maCuoc) || maCuoc <= 0){
        return {isValid: false, status: 400, message: 'Mã cuộc trò chuyện không hợp lệ!'}
    }

    return {isValid: true, data: maCuoc}
}


module.exports = {validateCreateMessage, validateConversationId}