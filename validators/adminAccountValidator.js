function validateAccountId(accountId){
    const id = Number(accountId)

    if (!Number.isInteger(id) || id <= 0){
        return {isValid: false, status: 400, message: 'Mã tài khoản không hợp lệ!'}
    }

    return {isValid: true, data: id}
}


function validateGetAccountsQuery(query){
    const {keyword, role, status, page, limit} = query

    const data = {
        keyword: null,
        role: null,
        status: null,
        page: 1,
        limit: 20
    }

    if (keyword !== undefined){
        if (typeof keyword !== 'string'){
            return {isValid: false, status: 400, message: 'Từ khóa tìm kiếm không hợp lệ!'}
        }

        const normalizedKeyword = keyword.trim()

        if (normalizedKeyword.length > 100){
            return {isValid: false, status: 400, message: 'Từ khóa tìm kiếm không được vượt quá 100 ký tự!'}
        }

        data.keyword = normalizedKeyword || null
    }

    if (role !== undefined){
        const validRoles = [
            'Sinh viên',
            'Quản trị viên'
        ]

        if (typeof role !== 'string' || !validRoles.includes(role.trim())){
            return {isValid: false, status: 400, message: 'Vai trò không hợp lệ!'}
        }

        data.role = role.trim()
    }

    if (status !== undefined){
        const validStatus = [
            'Hoạt động',
            'Bị hạn chế',
            'Tạm khóa',
            'Đã khóa'
        ]

        if (typeof status !== 'string' || !validStatus.includes(status.trim())){
            return {isValid: false, status: 400, message: 'Trạng thái không hợp lệ!'}
        }

        data.status = status.trim()
    }

    if (page !== undefined){
        const value = Number(page)

        if (!Number.isInteger(value) || value <= 0){
            return {isValid: false, status: 400, message: 'Trang không hợp lệ!'}
        }

        data.page = value
    }

    if (limit !== undefined){
        const value = Number(limit)

        if (!Number.isInteger(value) || value <= 0 || value > 100){
            return {isValid: false, status: 400, message: 'Giới hạn mỗi trang phải từ 1 đến 100!'}
        }

        data.limit = value
    }

    return {isValid: true, data}
}


function validateRestrictAccount(body){
    const {
        LYDOHANCHED,
        HANCHEDEN
    } = body

    if (typeof LYDOHANCHED !== 'string' || LYDOHANCHED.trim() === ''){
        return {isValid: false, status: 400, message: 'Vui lòng nhập lý do hạn chế!'}
    }

    const reason = LYDOHANCHED.trim()

    if (reason.length < 5){
        return {isValid: false, status: 400, message: 'Lý do hạn chế phải có ít nhất 5 ký tự!'}
    }

    if (reason.length > 500){
        return {isValid: false, status: 400, message: 'Lý do hạn chế không được vượt quá 500 ký tự!'}
    }

    let restrictedUntil = null


    if (HANCHEDEN !== undefined && HANCHEDEN !== null){
        if (typeof HANCHEDEN !== 'string'){
            return {isValid: false, status: 400, message: 'Ngày hết hạn hạn chế không hợp lệ!'
            }
        }

        const normalizedRestrictedUntil = HANCHEDEN.trim()

        if (normalizedRestrictedUntil !== ''){
            const date = new Date(normalizedRestrictedUntil)

            if (Number.isNaN(date.getTime())){
                return {isValid: false, status: 400, message: 'Ngày hết hạn hạn chế không hợp lệ!'}
            }

            if (date.getTime() <= Date.now()){
                return {isValid: false, status: 400, message: 'Ngày hết hạn hạn chế phải lớn hơn thời gian hiện tại!'}
            }

            restrictedUntil = date
        }
    }

    return {
        isValid: true,
        data: {
            reason,
            restrictedUntil
        }
    }
}


module.exports = {
    validateAccountId,
    validateGetAccountsQuery,
    validateRestrictAccount
}