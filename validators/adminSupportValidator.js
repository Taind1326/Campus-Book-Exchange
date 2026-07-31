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


function validateAdminSupportListQuery(query = {}) {
    const page = query.page === undefined ? 1 : Number(query.page)
    const limit = query.limit === undefined ? 20 : Number(query.limit)

    if (!Number.isInteger(page) || page <= 0) {
        return {isValid: false, status: 400, message: 'Trang không hợp lệ!'}
    }

    if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
        return {isValid: false, status: 400, message: 'Số dòng mỗi trang phải từ 1 đến 100!'}
    }

    const loaiPhanHoi = typeof query.loaiPhanHoi === 'string' ? query.loaiPhanHoi.trim() : ''
    const trangThai = typeof query.trangThai === 'string' ? query.trangThai.trim() : ''
    const mucDoUuTien = typeof query.mucDoUuTien === 'string'  ? query.mucDoUuTien.trim() : ''
    const tuKhoa = typeof query.tuKhoa === 'string' ? query.tuKhoa.trim() : ''
    const tuNgay = typeof query.tuNgay === 'string' ? query.tuNgay.trim() : ''
    const denNgay = typeof query.denNgay === 'string' ? query.denNgay.trim() : ''

    const danhSachLoaiPhanHoi = [
        'Báo lỗi',
        'Đề xuất tính năng',
        'Góp ý giao diện',
        'Hỗ trợ tài khoản',
        'Khác'
    ]

    const danhSachTrangThai = [
        'Mới',
        'Đang xử lý',
        'Đã phản hồi',
        'Đã đóng',
        'Đã hủy'
    ]

    const danhSachMucDoUuTien = [
        'Thấp',
        'Trung bình',
        'Cao'
    ]

    if (loaiPhanHoi && !danhSachLoaiPhanHoi.includes(loaiPhanHoi)) {
        return {isValid: false, status: 400, message: 'Loại phản hồi không hợp lệ!'}
    }

    if (trangThai && !danhSachTrangThai.includes(trangThai)) {
        return {isValid: false, status: 400, message: 'Trạng thái phản hồi không hợp lệ!'}
    }

    if (mucDoUuTien && !danhSachMucDoUuTien.includes(mucDoUuTien)) {
        return {isValid: false, status: 400, message: 'Mức độ ưu tiên không hợp lệ!'}
    }

    if (tuKhoa.length > 300) {
        return {isValid: false, status: 400, message: 'Từ khóa không được vượt quá 300 ký tự!'}
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
            loaiPhanHoi: loaiPhanHoi || null,
            trangThai: trangThai || null,
            mucDoUuTien: mucDoUuTien || null,
            tuKhoa: tuKhoa || null,
            tuNgay: tuNgay || null,
            denNgay: denNgay || null
        }
    }
}


function validateSupportId(value) {
    if (value === undefined || value === null || value === '') {
        return {isValid: false, status: 400, message: 'Thiếu mã phản hồi!'}
    }

    const maPhanHoi = Number(value)

    if (!Number.isInteger(maPhanHoi) || maPhanHoi <= 0) {
        return {isValid: false, status: 400, message: 'Mã phản hồi không hợp lệ!'}
    }

    return {
        isValid: true,
        data: {maPhanHoi}
    }
}


function validateSupportPriority(body = {}) {
    const {MUCDOUUTIEN} = body

    if (typeof MUCDOUUTIEN !== 'string' || !MUCDOUUTIEN.trim()) {
        return {isValid: false, status: 400, message: 'Mức độ ưu tiên là bắt buộc!'}
    }

    const mucDoUuTien = MUCDOUUTIEN.trim()

    const danhSachMucDoUuTien = [
        'Thấp',
        'Trung bình',
        'Cao'
    ]

    if (!danhSachMucDoUuTien.includes(mucDoUuTien)) {
        return {isValid: false, status: 400, message: 'Mức độ ưu tiên không hợp lệ!'}
    }

    return {
        isValid: true,
        data: {
            mucDoUuTien
        }
    }
}

module.exports = {
    validateAdminSupportListQuery,
    validateSupportId,
    validateSupportPriority
}