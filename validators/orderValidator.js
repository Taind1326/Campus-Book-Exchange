function validateCreateOrder(body) {
    const {MAGT, SOLUONG, MAGTMANGDOI, SOLUONGMANGDOI} = body

    if (MAGT === undefined || MAGT === null || MAGT === '') {
        return {isValid: false, status: 400, message: 'Thiếu mã giáo trình!'}
    }

    if (SOLUONG === undefined || SOLUONG === null || SOLUONG === '') {
        return {isValid: false, status: 400, message: 'Thiếu số lượng muốn giao dịch!'}
    }

    const maGT = Number(MAGT)
    const soLuong = Number(SOLUONG)

    if (!Number.isInteger(maGT) || maGT <= 0) {
        return {isValid: false, status: 400, message: 'Mã giáo trình không hợp lệ!'}
    }

    if (!Number.isInteger(soLuong) || soLuong <= 0) {
        return {isValid: false, status: 400, message: 'Số lượng phải là số nguyên lớn hơn 0!'}
    }

    const coMaGTMangDoi = MAGTMANGDOI !== undefined && MAGTMANGDOI !== null && MAGTMANGDOI !== ''
    const coSoLuongMangDoi = SOLUONGMANGDOI !== undefined && SOLUONGMANGDOI !== null && SOLUONGMANGDOI !== ''

    if (coMaGTMangDoi !== coSoLuongMangDoi) {
        return {isValid: false, status: 400, message: 'Phải cung cấp đầy đủ giáo trình mang đổi và số lượng mang đổi!'}
    }

    let maGTMangDoi = null
    let soLuongMangDoi = null

    if (coMaGTMangDoi && coSoLuongMangDoi) {
        maGTMangDoi = Number(MAGTMANGDOI)
        soLuongMangDoi = Number(SOLUONGMANGDOI)

        if (!Number.isInteger(maGTMangDoi) || maGTMangDoi <= 0) {
            return {isValid: false, status: 400, message: 'Mã giáo trình mang đổi không hợp lệ!'}
        }

        if (!Number.isInteger(soLuongMangDoi) || soLuongMangDoi <= 0) {
            return {isValid: false, status: 400, message: 'Số lượng giáo trình mang đổi phải là số nguyên lớn hơn 0!'
}
        }

        if (maGTMangDoi === maGT) {
            return {isValid: false, status: 400, message: 'Giáo trình mang đổi phải khác giáo trình muốn nhận!'}
        }
    }

    return {
        isValid: true,
        data: {
            maGT,
            soLuong,
            maGTMangDoi,
            soLuongMangDoi
        }
    }
}


function validateOrderId(value) {
    if (value === undefined || value === null || value === '') {
        return {isValid: false, status: 400, message: 'Thiếu mã đơn hàng!'}
    }

    const maDH = Number(value)

    if (!Number.isInteger(maDH) || maDH <= 0) {
        return {isValid: false, status: 400, message: 'Mã đơn hàng không hợp lệ!'}
    }

    return {isValid: true, data: {maDH}}
}


function validateOrderListQuery(query) {
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

module.exports = {validateCreateOrder, validateOrderId, validateOrderListQuery}