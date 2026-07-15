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

module.exports = {validateCreateOrder}