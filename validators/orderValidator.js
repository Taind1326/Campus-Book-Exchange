function validateCreateOrder(body){
    const {MAGT, SOLUONG} = body

    if (MAGT === undefined){
        return {isValid: false, status: 400, message: 'Thiếu mã giáo trình!'}
    }

    if (SOLUONG === undefined){
        return {isValid: false, status: 400, message: 'Thiếu số lượng muốn mua!'}
    }


    const data = {
        maGT: Number(MAGT),
        soLuong: Number(SOLUONG)
    }

    if (!Number.isInteger(data.maGT) || data.maGT <= 0){
        return {isValid: false, status: 400, message: 'Mã giáo trình không hợp lệ!'}
    }

    if (!Number.isInteger(data.soLuong) || data.soLuong <= 0){
        return {isValid: false, status: 400, message: 'Số lượng phải là số nguyên lớn hơn 0!'}
    }

    return {isValid: true, data}
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