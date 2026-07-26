function validateCreateReport(body) {
    const { MADH, LOAIBAOCAO, NOIDUNG, MINHCHUNG} = body

    if (MADH === undefined || MADH === null || MADH === '') {
        return {isValid: false, status: 400, message: 'Mã đơn hàng là bắt buộc!'}
    }

    const maDH = Number(MADH)

    if (!Number.isInteger(maDH) || maDH <= 0) {
        return {isValid: false, status: 400, message: 'Mã đơn hàng không hợp lệ!'}
    }

    if (LOAIBAOCAO === undefined || LOAIBAOCAO === null || typeof LOAIBAOCAO !== 'string' || !LOAIBAOCAO.trim()) {
        return {isValid: false, status: 400,  message: 'Loại báo cáo là bắt buộc!'}
    }

    const loaiBaoCao = LOAIBAOCAO.trim()

    const danhSachLoaiBaoCao = [
        'Lừa đảo',
        'Không đến điểm hẹn',
        'Sách không đúng mô tả',
        'Phá giao dịch',
        'Khác'
    ]

    if (!danhSachLoaiBaoCao.includes(loaiBaoCao)) {
        return {isValid: false, status: 400, message: 'Loại báo cáo giao dịch không hợp lệ!'}
    }

    if (NOIDUNG === undefined || NOIDUNG === null || typeof NOIDUNG !== 'string' || !NOIDUNG.trim()) {
        return {isValid: false, status: 400, message: 'Nội dung báo cáo là bắt buộc!'}
    }

    const noiDung = NOIDUNG.trim()

    if (noiDung.length < 10) {
        return {isValid: false, status: 400, message: 'Nội dung báo cáo phải có ít nhất 10 ký tự!'}
    }

    if (noiDung.length > 1500) {
        return {isValid: false, status: 400, message: 'Nội dung báo cáo không được vượt quá 1500 ký tự!'}
    }

    if (MINHCHUNG !== undefined && MINHCHUNG !== null && typeof MINHCHUNG !== 'string') {
        return {isValid: false, status: 400, message: 'Minh chứng phải là chuỗi!'}
    }

    const minhChung = typeof MINHCHUNG === 'string' ? MINHCHUNG.trim() : null

    if (minhChung && minhChung.length > 500) {
        return {isValid: false, status: 400, message: 'Minh chứng không được vượt quá 500 ký tự!'}
    }

    return {
        isValid: true,
        data: {
            maDH,
            loaiBaoCao,
            noiDung,
            minhChung: minhChung || null
        }
    }
}


module.exports = {
    validateCreateReport
}