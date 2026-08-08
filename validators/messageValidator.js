function validateCreateMessage(body) {
    const {
        MACUOC,
        NOIDUNG
    } = body

    const conversationValidation =
        parseConversationId(MACUOC)

    if (!conversationValidation.isValid) {
        return conversationValidation
    }

    if (NOIDUNG === undefined) {
        return {
            isValid: false,
            status: 400,
            message:
                'Thiếu nội dung tin nhắn!'
        }
    }

    if (typeof NOIDUNG !== 'string') {
        return {
            isValid: false,
            status: 400,
            message:
                'Nội dung tin nhắn không hợp lệ!'
        }
    }

    const noiDung = NOIDUNG.trim()

    if (noiDung.length === 0) {
        return {
            isValid: false,
            status: 400,
            message:
                'Nội dung tin nhắn không được để trống!'
        }
    }

    if (noiDung.length > 5000) {
        return {
            isValid: false,
            status: 400,
            message:
                'Nội dung tin nhắn không được vượt quá 5000 ký tự!'
        }
    }

    return {
        isValid: true,
        data: {
            maCuoc:
                conversationValidation.data,
            noiDung
        }
    }
}


function validateCreateImageMessage(
    body,
    files
) {
    const conversationValidation =
        parseConversationId(
            body.MACUOC
        )

    if (!conversationValidation.isValid) {
        return conversationValidation
    }

    if (
        !Array.isArray(files) ||
        files.length === 0
    ) {
        return {
            isValid: false,
            status: 400,
            message:
                'Vui lòng chọn ít nhất một hình ảnh!'
        }
    }

    if (files.length > 5) {
        return {
            isValid: false,
            status: 400,
            message:
                'Mỗi tin nhắn chỉ được gửi tối đa 5 hình ảnh!'
        }
    }

    const rawContent =
        body.NOIDUNG

    if (
        rawContent !== undefined &&
        rawContent !== null &&
        typeof rawContent !== 'string'
    ) {
        return {
            isValid: false,
            status: 400,
            message:
                'Nội dung tin nhắn không hợp lệ!'
        }
    }

    const noiDung =
        typeof rawContent === 'string'
            ? rawContent.trim()
            : ''

    if (noiDung.length > 5000) {
        return {
            isValid: false,
            status: 400,
            message:
                'Nội dung tin nhắn không được vượt quá 5000 ký tự!'
        }
    }

    return {
        isValid: true,
        data: {
            maCuoc:
                conversationValidation.data,
            noiDung:
                noiDung || null
        }
    }
}


function validateConversationId(id) {
    return parseConversationId(id)
}


function parseConversationId(value) {
    if (value === undefined) {
        return {
            isValid: false,
            status: 400,
            message:
                'Thiếu mã cuộc trò chuyện!'
        }
    }

    const maCuoc = Number(value)

    if (
        !Number.isInteger(maCuoc) ||
        maCuoc <= 0
    ) {
        return {
            isValid: false,
            status: 400,
            message:
                'Mã cuộc trò chuyện không hợp lệ!'
        }
    }

    return {
        isValid: true,
        data: maCuoc
    }
}


module.exports = {
    validateConversationId,
    validateCreateImageMessage,
    validateCreateMessage
}