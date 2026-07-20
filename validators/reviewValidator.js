function validateCreateReview(data) {
    const maDH = Number(data.maDH)
    const soSao = Number(data.soSao)
    const binhLuan = data.binhLuan

    if (data.maDH === undefined || data.maDH === null || data.maDH === '') {
        return {isValid: false, status: 400, message: 'Mã đơn hàng là bắt buộc!'}
    }

    if (!Number.isInteger(maDH) || maDH <= 0) {
        return {isValid: false, status: 400, message: 'Mã đơn hàng không hợp lệ!'}
    }

    if (data.soSao === undefined || data.soSao === null || data.soSao === '') {
        return {isValid: false, status: 400, message: 'Số sao là bắt buộc!'}
    }

    if (!Number.isInteger(soSao)) {
        return {isValid: false, status: 400, message: 'Số sao phải là số nguyên!'}
    }

    if (soSao < 1 || soSao > 5) {
        return {isValid: false, status: 400, message: 'Số sao phải từ 1 đến 5!'}
    }

    if (binhLuan !== undefined && binhLuan !== null && typeof binhLuan !== 'string') {
        return {isValid: false, status: 400, message: 'Bình luận phải là chuỗi!'}
    }

    const binhLuanDaXuLy = typeof binhLuan === 'string' ? binhLuan.trim() : null

    if (binhLuanDaXuLy && binhLuanDaXuLy.length > 1000) {
        return {isValid: false, status: 400, message: 'Bình luận không được vượt quá 1000 ký tự!'}
    }

    return {isValid: true, data: {
            maDH,
            soSao,
            binhLuan: binhLuanDaXuLy || null
        }
    }
}


function validateSellerId(maTKValue) {
    const maTK = Number(maTKValue)

    if (!Number.isInteger(maTK) || maTK <= 0) {
        return {isValid: false, status: 400, message: 'Mã tài khoản người bán không hợp lệ!'}
    }

    return {isValid: true, data: maTK}
}


module.exports = {validateCreateReview, validateSellerId}