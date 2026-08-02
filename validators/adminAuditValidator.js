function isValidDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false
    }

    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(Date.UTC(year, month - 1, day))

    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    )
}


function validateAdminAuditListQuery(query = {}) {
    const page = query.page === undefined ? 1 : Number(query.page)
    const limit = query.limit === undefined ? 20 : Number(query.limit)

    if (!Number.isInteger(page) || page <= 0) {
        return {isValid: false, status: 400, message: 'Trang không hợp lệ!'}
    }

    if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
        return {isValid: false, status: 400, message: 'Số dòng mỗi trang phải từ 1 đến 100!'}
    }

    let adminId = null

    if (query.adminId !== undefined && query.adminId !== null && query.adminId !== '') {
        adminId = Number(query.adminId)

        if (!Number.isInteger(adminId) || adminId <= 0) {
            return {isValid: false, status: 400, message: 'Mã Admin không hợp lệ!'}
        }
    }

    if (query.hanhDong !== undefined && typeof query.hanhDong !== 'string') {
        return {isValid: false, status: 400, message: 'Hành động không hợp lệ!'}
    }

    if (query.doiTuong !== undefined && typeof query.doiTuong !== 'string') {
        return {isValid: false, status: 400, message: 'Đối tượng nhật ký không hợp lệ!'}
    }

    if (query.tuNgay !== undefined && typeof query.tuNgay !== 'string') {
        return {isValid: false, status: 400, message: 'Ngày bắt đầu không hợp lệ!'}
    }

    if (query.denNgay !== undefined && typeof query.denNgay !== 'string') {
        return {isValid: false, status: 400, message: 'Ngày kết thúc không hợp lệ!'}
    }

    const hanhDong = typeof query.hanhDong === 'string' ? query.hanhDong.trim() : ''
    const doiTuong = typeof query.doiTuong === 'string' ? query.doiTuong.trim() : ''
    const tuNgay = typeof query.tuNgay === 'string' ? query.tuNgay.trim() : ''
    const denNgay = typeof query.denNgay === 'string' ? query.denNgay.trim() : ''

    const danhSachDoiTuong = [
        'Tài khoản',
        'Giáo trình',
        'Phản hồi hỗ trợ',
        'Báo cáo'
    ]

    if (hanhDong.length > 100) {
        return {isValid: false, status: 400, message: 'Hành động không được vượt quá 100 ký tự!'}
    }

    if (doiTuong && !danhSachDoiTuong.includes(doiTuong)) {
        return {isValid: false, status: 400, message: 'Đối tượng nhật ký không hợp lệ!'}
    }

    if (tuNgay && !isValidDate(tuNgay)) {
        return {isValid: false, status: 400, message: 'Ngày bắt đầu không hợp lệ!'}
    }

    if (denNgay && !isValidDate(denNgay)) {
        return {isValid: false, status: 400, message: 'Ngày kết thúc không hợp lệ!'}
    }

    if (tuNgay && denNgay && tuNgay > denNgay) {
        return {isValid: false, status: 400, message: 'Ngày bắt đầu không được sau ngày kết thúc!'}
    }

    return {
        isValid: true,
        data: {
            page,
            limit,
            adminId,
            hanhDong: hanhDong || null,
            doiTuong: doiTuong || null,
            tuNgay: tuNgay || null,
            denNgay: denNgay || null
        }
    }
}


function validateAuditId(value) {
    if (value === undefined || value === null || value === '') {
        return {isValid: false, status: 400, message: 'Thiếu mã nhật ký!'}
    }

    const auditId = Number(value)

    if (!Number.isInteger(auditId) || auditId <= 0) {
        return {isValid: false, status: 400, message: 'Mã nhật ký không hợp lệ!'}
    }

    return {
        isValid: true,
        data: {auditId}
    }
}


module.exports = {
    validateAdminAuditListQuery,
    validateAuditId
}