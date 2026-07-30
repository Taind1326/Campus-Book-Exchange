function validateCreateReview(data = {}) {
    const maDH = Number(data.maDH)
    const soSao = Number(data.soSao)

    if (data.maDH === undefined || data.maDH === null || data.maDH === '') {
        return {isValid: false, status: 400, message: 'Mã đơn hàng là bắt buộc!'}
    }

    if (!Number.isInteger(maDH) || maDH <= 0) {
        return {isValid: false, status: 400, message: 'Mã đơn hàng không hợp lệ!'
        }
    }

    if (data.soSao === undefined || data.soSao === null || data.soSao === '') {
        return {isValid: false, status: 400, message: 'Số sao là bắt buộc!'}
    }

    if (!Number.isInteger(soSao)) {
        return {isValid: false, status: 400, message: 'Số sao phải là số nguyên!'}
    }

    if (soSao < 1 || soSao > 5) {
        return {isValid: false, status: 400, message: 'Số sao phải từ 1 đến 5!'
        }
    }

    let binhLuan = null

    if (data.binhLuan !== undefined && data.binhLuan !== null) {
        if (typeof data.binhLuan !== 'string') {
            return {isValid: false, status: 400, message: 'Bình luận phải là chuỗi!'}
        }

        binhLuan = data.binhLuan.trim()

        if (!binhLuan) {
            return {isValid: false, status: 400, message: 'Bình luận không được chỉ chứa khoảng trắng!'}
        }

        if (binhLuan.length > 1000) {
            return {isValid: false, status: 400, message: 'Bình luận không được vượt quá 1000 ký tự!'}
        }
    }

    return {
        isValid: true,
        data: {
            maDH,
            soSao,
            binhLuan
        }
    }
}


function validateSellerId(value) {
    if (value === undefined || value === null || value === '') {
        return {isValid: false, status: 400, message: 'Thiếu mã tài khoản người bán!'}
    }

    const maTK = Number(value)

    if (!Number.isInteger(maTK) || maTK <= 0) {
        return {isValid: false, status: 400, message: 'Mã tài khoản người bán không hợp lệ!'}
    }

    return {
        isValid: true,
        data: maTK
    }
}


function validateReviewListQuery(query = {}) {
    const page = query.page === undefined ? 1 : Number(query.page)
    const limit = query.limit === undefined ? 20 : Number(query.limit)

    if (!Number.isInteger(page) || page <= 0) {
        return {isValid: false, status: 400, message: 'Trang không hợp lệ!'}
    }

    if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
        return {isValid: false, status: 400, message: 'Số dòng mỗi trang phải từ 1 đến 100!'}
    }

    return {
        isValid: true,
        data: {
            page,
            limit
        }
    }
}


module.exports = {
    validateCreateReview,
    validateSellerId,
    validateReviewListQuery
}