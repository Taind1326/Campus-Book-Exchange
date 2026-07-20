function validateCreateReport(body) {
    const maDH = Number(body.maDH)
    const maTN = body.maTN === undefined || body.maTN === null || body.maTN === '' ? null : Number(body.maTN)

    const loaiBaoCao = body.loaiBaoCao
    const noiDung = body.noiDung
    const minhChung = body.minhChung

    if (body.maDH === undefined || body.maDH === null || body.maDH === '') {
        return {isValid: false, status: 400, message: 'Mã đơn hàng là bắt buộc!'}
    }

    if (!Number.isInteger(maDH) || maDH <= 0) {
        return {isValid: false, status: 400, message: 'Mã đơn hàng không hợp lệ!'}
    }

    if (body.maTN !== undefined && body.maTN !== null && body.maTN !== '') {
        if (!Number.isInteger(maTN) || maTN <= 0) {
            return {isValid: false, status: 400, message: 'Mã tin nhắn không hợp lệ!'}
        }
    }

     if (loaiBaoCao === undefined || loaiBaoCao === null) {
        return {isValid: false, status: 400, message: 'Loại báo cáo là bắt buộc!'}
    }

    if (typeof loaiBaoCao !== 'string') {
        return {isValid: false, status: 400, message: 'Loại báo cáo phải là chuỗi!'}
    }

    const loaiBaoCaoDaXuLy = loaiBaoCao.trim()

    if (!loaiBaoCaoDaXuLy) {
        return {isValid: false, status: 400, message: 'Loại báo cáo là bắt buộc!'}
    }

    const danhSachLoaiBaoCao = [
        'Lừa đảo',
        'Quấy rối',
        'Nội dung không phù hợp',
        'Giáo trình không đúng mô tả',
        'Không thực hiện giao dịch',
        'Khác'
    ]

    if (!danhSachLoaiBaoCao.includes(loaiBaoCaoDaXuLy)) {
        return { isValid: false, status: 400, message: 'Loại báo cáo không hợp lệ!' }
    }

    if (noiDung === undefined || noiDung === null) {
        return {isValid: false, status: 400, message: 'Nội dung báo cáo là bắt buộc!'}
    }

    if (typeof noiDung !== 'string') {
        return {isValid: false, status: 400, message: 'Nội dung báo cáo phải là chuỗi!'}
    }

    const noiDungDaXuLy = noiDung.trim()

    if (!noiDungDaXuLy) {
        return {isValid: false, status: 400, message: 'Nội dung báo cáo là bắt buộc!'}
    }


    if (noiDungDaXuLy.length < 10) {
        return {
            isValid: false, status: 400, message: 'Nội dung báo cáo phải có ít nhất 10 ký tự!'  }
    }

    if (noiDungDaXuLy.length > 2000) {
        return { isValid: false, status: 400, message: 'Nội dung báo cáo không được vượt quá 2000 ký tự!' }
    }

    if (minhChung !== undefined && minhChung !== null && typeof minhChung !== 'string') {
        return { isValid: false, status: 400, message: 'Minh chứng phải là chuỗi!' }
    }

    const minhChungDaXuLy = typeof minhChung === 'string' ? minhChung.trim() : null

    if (minhChungDaXuLy && minhChungDaXuLy.length > 2000) {
        return { isValid: false, status: 400, message: 'Minh chứng không được vượt quá 2000 ký tự!' }
    }

    return {
        isValid: true,
        data: {
            maDH,
            maTN,
            loaiBaoCao: loaiBaoCaoDaXuLy,
            noiDung: noiDungDaXuLy,
            minhChung: minhChungDaXuLy || null
        }
    }
}


module.exports = {validateCreateReport}