function validateAdminReportListQuery(query = {}) {
    const page = query.page === undefined ? 1 : Number(query.page)
    const limit = query.limit === undefined ? 20 : Number(query.limit)

    const danhSachTrangThai = [
        'Chờ xử lý',
        'Đang xử lý',
        'Hợp lệ',
        'Không hợp lệ'
    ]

    const danhSachDoiTuong = [
        'Giao dịch',
        'Tin nhắn'
    ]

    if (!Number.isInteger(page) || page <= 0) {
        return {isValid: false, status: 400,  message: 'Trang không hợp lệ!'}
    }

    if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
        return {isValid: false, status: 400, message: 'Số dòng mỗi trang phải từ 1 đến 100!'}
    }

    const trangThai = typeof query.trangThai === 'string' ? query.trangThai.trim() : ''
    const doiTuongBaoCao = typeof query.doiTuongBaoCao === 'string' ? query.doiTuongBaoCao.trim() : ''

    if (trangThai && !danhSachTrangThai.includes(trangThai)) {
        return {isValid: false, status: 400, message: 'Trạng thái báo cáo không hợp lệ!'}
    }

    if (doiTuongBaoCao && !danhSachDoiTuong.includes(doiTuongBaoCao)) {
        return {isValid: false, status: 400, message: 'Đối tượng báo cáo không hợp lệ!'}
    }

    return {
        isValid: true,
        data: {
            page,
            limit,
            trangThai: trangThai || null,
            doiTuongBaoCao: doiTuongBaoCao || null
        }
    }
}


function validateReportId(value) {
    if (value === undefined || value === null || value === '') {
        return {isValid: false, status: 400, message: 'Thiếu mã báo cáo!'}
    }

    const maBC = Number(value)

    if (!Number.isInteger(maBC) || maBC <= 0) {
        return { isValid: false, status: 400, message: 'Mã báo cáo không hợp lệ!'}
    }

    return {
        isValid: true,
        data: {maBC}
    }
}


module.exports = {
    validateAdminReportListQuery,
    validateReportId
}