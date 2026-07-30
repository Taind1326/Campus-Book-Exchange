function validateCreateSupport(body = {}) {
    const {
        LOAIPHANHOI,
        TIEUDE,
        NOIDUNG
    } = body

    const danhSachLoaiPhanHoi = [
        'Báo lỗi',
        'Đề xuất tính năng',
        'Góp ý giao diện',
        'Hỗ trợ tài khoản',
        'Khác'
    ]

    if (typeof LOAIPHANHOI !== 'string' || !LOAIPHANHOI.trim()) {
        return {isValid: false, status: 400, message: 'Loại phản hồi là bắt buộc!'}
    }

    const loaiPhanHoi = LOAIPHANHOI.trim()

    if (!danhSachLoaiPhanHoi.includes(loaiPhanHoi)) {
        return {isValid: false, status: 400, message: 'Loại phản hồi không hợp lệ!'}
    }

    if (typeof TIEUDE !== 'string' || !TIEUDE.trim()) {
        return {isValid: false, status: 400, message: 'Tiêu đề phản hồi là bắt buộc!'}
    }

    const tieuDe = TIEUDE.trim()

    if (tieuDe.length < 5) {
        return {isValid: false, status: 400, message: 'Tiêu đề phải có ít nhất 5 ký tự!'}
    }

    if (tieuDe.length > 200) {
        return {isValid: false, status: 400, message: 'Tiêu đề không được vượt quá 200 ký tự!'}
    }

    if (typeof NOIDUNG !== 'string' || !NOIDUNG.trim()) {
        return {isValid: false, status: 400, message: 'Nội dung phản hồi là bắt buộc!'}
    }

    const noiDung = NOIDUNG.trim()

    if (noiDung.length < 10) {
        return {isValid: false, status: 400, message: 'Nội dung phản hồi phải có ít nhất 10 ký tự!'}
    }

    if (noiDung.length > 2000) {
        return {isValid: false, status: 400, message: 'Nội dung phản hồi không được vượt quá 2000 ký tự!'}
    }

    return {
        isValid: true,
        data: {
            loaiPhanHoi,
            tieuDe,
            noiDung
        }
    }
}


function validateSupportListQuery(query = {}) {
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
        data: {
            maPhanHoi
        }
    }
}

module.exports = {
    validateCreateSupport,
    validateSupportListQuery,
    validateSupportId
}