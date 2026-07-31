function validateAccountId(value) {
    if (value === undefined || value === null || value === '') {
        return {isValid: false, status: 400, message: 'Thiếu mã tài khoản!'}
    }

    const accountId = Number(value)

    if (!Number.isInteger(accountId) || accountId <= 0) {
        return {isValid: false, status: 400, message: 'Mã tài khoản không hợp lệ!'}
    }

    return {
        isValid: true,
        data: {accountId}
    }
}


function validateGetAccountsQuery(query = {}) {
    const page = query.page === undefined ? 1 : Number(query.page)
    const limit = query.limit === undefined ? 20 : Number(query.limit)

    if (!Number.isInteger(page) || page <= 0) {
        return {isValid: false, status: 400, message: 'Trang không hợp lệ!'}
    }

    if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
        return {isValid: false, status: 400, message: 'Số dòng mỗi trang phải từ 1 đến 100!'}
    }

    if (query.keyword !== undefined && typeof query.keyword !== 'string') {
        return {isValid: false, status: 400, message: 'Từ khóa tìm kiếm không hợp lệ!'}
    }

    if (query.role !== undefined && typeof query.role !== 'string') {
        return {isValid: false, status: 400, message: 'Vai trò không hợp lệ!'}
    }

    if (query.status !== undefined && typeof query.status !== 'string') {
        return {isValid: false, status: 400, message: 'Trạng thái tài khoản không hợp lệ!'}
    }

    const keyword = typeof query.keyword === 'string' ? query.keyword.trim() : ''
    const role = typeof query.role === 'string' ? query.role.trim() : ''
    const status = typeof query.status === 'string' ? query.status.trim() : ''

    const validRoles = [
        'Sinh viên',
        'Quản trị viên'
    ]

    const validStatuses = [
        'Hoạt động',
        'Bị hạn chế',
        'Tạm khóa',
        'Đã khóa'
    ]

    if (keyword.length > 100) {
        return {isValid: false, status: 400, message: 'Từ khóa tìm kiếm không được vượt quá 100 ký tự!'}
    }

    if (role && !validRoles.includes(role)) {
        return {isValid: false, status: 400, message: 'Vai trò không hợp lệ!'}
    }

    if (status && !validStatuses.includes(status)) {
        return {isValid: false, status: 400, message: 'Trạng thái tài khoản không hợp lệ!'}
    }

    return {
        isValid: true,
        data: {
            keyword: keyword || null,
            role: role || null,
            status: status || null,
            page,
            limit
        }
    }
}


function validateReason(value, action) {
    if (typeof value !== 'string' || !value.trim()) {
        return {isValid: false, status: 400, message: `Lý do ${action} là bắt buộc!`}
    }

    const reason = value.trim()

    if (reason.length < 5) {
        return {isValid: false, status: 400, message: `Lý do ${action} phải có ít nhất 5 ký tự!`}
    }

    if (reason.length > 500) {
        return {isValid: false, status: 400, message: `Lý do ${action} không được vượt quá 500 ký tự!`}
    }

    return {
        isValid: true,
        data: {
            reason
        }
    }
}


function validateFutureDate(value, required, action) {
    if (value === undefined || value === null || value === '') {
        if (required) {
            return {isValid: false, status: 400, message: `Thời hạn ${action} là bắt buộc!`}
        }

        return {
            isValid: true,
            data: {
                restrictedUntil: null
            }
        }
    }

    if (typeof value !== 'string' || !value.trim()) {
        return {isValid: false, status: 400, message: `Thời hạn ${action} không hợp lệ!`}
    }

    const restrictedUntil = new Date(value.trim())

    if (Number.isNaN(restrictedUntil.getTime())) {
        return {isValid: false, status: 400, message: `Thời hạn ${action} không hợp lệ!`}
    }

    if (restrictedUntil.getTime() <= Date.now()) {
        return {isValid: false, status: 400, message: `Thời hạn ${action} phải lớn hơn thời gian hiện tại!`}
    }

    return {
        isValid: true,
        data: { restrictedUntil}
    }
}


function validateRestrictAccount(body = {}) {
    const reasonValidation = validateReason(body.LYDOHANCHED, 'hạn chế')

    if (!reasonValidation.isValid) {
        return reasonValidation
    }

    const dateValidation = validateFutureDate(body.HANCHEDEN, false, 'hạn chế')

    if (!dateValidation.isValid) {
        return dateValidation
    }

    return {
        isValid: true,
        data: {
            reason: reasonValidation.data.reason,
            restrictedUntil: dateValidation.data.restrictedUntil
        }
    }
}


function validateTemporaryLockAccount(body = {}) {
    const reasonValidation = validateReason(body.LYDOHANCHED, 'tạm khóa')

    if (!reasonValidation.isValid) {
        return reasonValidation
    }

    const dateValidation = validateFutureDate(body.HANCHEDEN, true, 'tạm khóa')

    if (!dateValidation.isValid) {
        return dateValidation
    }

    return {
        isValid: true,
        data: {
            reason: reasonValidation.data.reason,
            restrictedUntil: dateValidation.data.restrictedUntil
        }
    }
}


function validatePermanentLockAccount(body = {}) {
    const reasonValidation = validateReason(body.LYDOHANCHED, 'khóa vĩnh viễn')

    if (!reasonValidation.isValid) {
        return reasonValidation
    }

    return {
        isValid: true,
        data: {
            reason: reasonValidation.data.reason
        }
    }
}


module.exports = {
    validateAccountId,
    validateGetAccountsQuery,
    validateRestrictAccount,
    validateTemporaryLockAccount,
    validatePermanentLockAccount
}