function validateNotificationId(id){
    const maTB = Number(id)

    if (!Number.isInteger(maTB) || maTB <= 0){
        return {isValid: false, status: 400, message: 'Mã thông báo không hợp lệ!'}
    }

    return {isValid: true, data: maTB}
}


module.exports = {validateNotificationId}