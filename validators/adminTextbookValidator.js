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


function validateAdminTextbookListQuery(query = {}) {
    const page = query.page === undefined ? 1 : Number(query.page)
    const limit = query.limit === undefined ? 20 : Number(query.limit)

    if (!Number.isInteger(page) || page <= 0) {
        return {isValid: false, status: 400, message: 'Trang không hợp lệ!'}
    }

    if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
        return {isValid: false, status: 400, message: 'Số dòng mỗi trang phải từ 1 đến 100!'}
    }

    const tuKhoa = typeof query.tuKhoa === 'string' ? query.tuKhoa.trim() : ''
    const maHocPhan = typeof query.maHocPhan === 'string' ? query.maHocPhan.trim() : ''
    const loai = typeof query.loai === 'string' ? query.loai.trim() : ''
    const trangThai = typeof query.trangThai === 'string' ? query.trangThai.trim() : ''
    const tuNgay = typeof query.tuNgay === 'string' ? query.tuNgay.trim() : ''
    const denNgay = typeof query.denNgay === 'string' ? query.denNgay.trim() : ''

    const danhSachLoai = [
        'Bán',
        'Tặng',
        'Trao đổi'
    ]

    const danhSachTrangThai = [
        'Đang hiển thị',
        'Đang giao dịch',
        'Tạm ẩn',
        'Hết hàng',
        'Đã xóa'
    ]

    if (tuKhoa.length > 300) {
        return {isValid: false, status: 400, message: 'Từ khóa không được vượt quá 300 ký tự!'}
    }

    if (maHocPhan.length > 20) {
        return {isValid: false, status: 400, message: 'Mã học phần không hợp lệ!'}
    }

    if (loai && !danhSachLoai.includes(loai)) {
        return {isValid: false, status: 400, message: 'Loại giáo trình không hợp lệ!'}
    }

    if (trangThai && !danhSachTrangThai.includes(trangThai)) {
        return {isValid: false, status: 400, message: 'Trạng thái giáo trình không hợp lệ!'}
    }

    let nguoiDang = null

    if (query.nguoiDang !== undefined && query.nguoiDang !== null && query.nguoiDang !== '') {
        nguoiDang = Number(query.nguoiDang)

        if (!Number.isInteger(nguoiDang) || nguoiDang <= 0) {
            return {isValid: false, status: 400, message: 'Mã tài khoản người đăng không hợp lệ!'}
        }
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
            tuKhoa: tuKhoa || null,
            maHocPhan: maHocPhan || null,
            loai: loai || null,
            trangThai: trangThai || null,
            nguoiDang,
            tuNgay: tuNgay || null,
            denNgay: denNgay || null
        }
    }
}


function validateTextbookId(value) {
    if (value === undefined || value === null || value === '') {
        return {isValid: false, status: 400, message: 'Thiếu mã giáo trình!'}
    }

    const maGT = Number(value)

    if (!Number.isInteger(maGT) || maGT <= 0) {
        return {isValid: false, status: 400, message: 'Mã giáo trình không hợp lệ!'}
    }

    return {
        isValid: true,
        data: {maGT}
    }
}



function validateHideTextbook(body = {}) {
    const {LYDO} = body

    if (typeof LYDO !== 'string' || !LYDO.trim()) {
        return {isValid: false, status: 400, message: 'Lý do tạm ẩn bài đăng là bắt buộc!'}
    }

    const lyDo = LYDO.trim()

    if (lyDo.length < 5) {
        return {isValid: false, status: 400, message: 'Lý do tạm ẩn phải có ít nhất 5 ký tự!'}
    }

    if (lyDo.length > 500) {
        return {isValid: false, status: 400, message: 'Lý do tạm ẩn không được vượt quá 500 ký tự!'}
    }

    return {
        isValid: true,
        data: {
            lyDo
        }
    }
}


module.exports = {
    validateAdminTextbookListQuery,
    validateTextbookId,
    validateHideTextbook
}