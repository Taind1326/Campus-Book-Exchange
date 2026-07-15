function validateCreateConversation(body){
    const {MAGT} = body

    if (MAGT === undefined){
        return {isValid: false, status: 400, message: 'Thiếu mã giáo trình!'}
    }

    if (typeof MAGT !== 'string'){
        return {isValid: false, status: 400, message: 'Mã giáo trình không hợp lệ!'}
    }

    const data = {maGT: Number(MAGT)}

    if (!Number.isInteger(data.maGT) || data.maGT <= 0){
        return {isValid: false, status: 400, message: 'Mã giáo trình không hợp lệ!'}
    }

    return {isValid: true, data}
}


module.exports = {validateCreateConversation}