function validateCreateTextbook(body, files){
    const {TENGT, SOLUONG, DONGIA, MAHOCPHAN, MOTA, LOAI} = body

    if (TENGT === undefined || SOLUONG === undefined || DONGIA === undefined || MAHOCPHAN === undefined || LOAI === undefined){
        return {isValid: false, status: 400, message: "Vui lòng nhập đầy đủ thông tin!"}
    }

    if (typeof TENGT !== 'string' || typeof SOLUONG !== 'string' || typeof DONGIA !== 'string' || typeof MAHOCPHAN !== 'string' || typeof LOAI !== 'string' || (MOTA !== undefined && typeof MOTA !== 'string')){
        return {isValid: false, status: 400, message: 'Dữ liệu giáo trình không hợp lệ!'}
    }

    const data = {
        tenGT: TENGT.trim(),
        maHocPhan: MAHOCPHAN.trim(),
        loai: LOAI.trim(),
        moTa: MOTA?.trim() || null,
        soLuong: Number(SOLUONG),
        donGia: Number(DONGIA)
    }

    if (data.tenGT.length < 3){
        return {isValid: false, status: 400, message: 'Tên giáo trình phải có ít nhất 3 ký tự!'}
    }

    if (!Number.isInteger(data.soLuong) || data.soLuong <= 0){
        return {isValid: false, status: 400, message: 'Số lượng là số nguyên lớn hơn 0!'}
    }

    if (!Number.isFinite(data.donGia) || data.donGia < 0){
        return {isValid: false, status: 400, message: 'Đơn giá không hợp lệ!'}
    }

    if (!/^\d{6,20}$/.test(data.maHocPhan)){
        return {isValid: false, status: 400, message: 'Mã học phần không hợp lệ!'}
    }

    const danhSachLoai = ['Bán', 'Tặng', 'Trao đổi']

    if (!danhSachLoai.includes(data.loai)){
        return {isValid: false, status: 400, message: 'Loại giáo trình không hợp lệ!'}
    }

    if (data.loai === 'Bán' && data.donGia <= 0){
        return {isValid: false, status: 400, message: 'Giá bán phải lớn hơn 0!'}
    }

    if (['Tặng', 'Trao đổi'].includes(data.loai) && data.donGia !== 0){
        return {isValid: false, status: 400, message: 'Giá của giáo trình tặng hoặc trao đổi phải bằng 0!'}
    }

    if (!files || files.length === 0){
        return {isValid: false, status: 400, message: 'Vui lòng chọn ít nhất 1 hình ảnh!'}
    }

    return {isValid: true, data}
}


function validateUpdateTextbook(body){
    const {TENGT, SOLUONG, DONGIA, MAHOCPHAN, MOTA, LOAI} = body

    if (TENGT === undefined || SOLUONG === undefined || DONGIA === undefined || MAHOCPHAN === undefined || LOAI === undefined){
        return {isValid: false, status: 400, message: "Vui lòng nhập đầy đủ thông tin!"}
    }

    if (typeof TENGT !== 'string' || typeof SOLUONG !== 'string' || typeof DONGIA !== 'string' || typeof MAHOCPHAN !== 'string' || typeof LOAI !== 'string' || (MOTA !== undefined && typeof MOTA !== 'string')){
        return {isValid: false, status: 400, message: 'Dữ liệu giáo trình không hợp lệ!'}
    }

    const data = {
        tenGT: TENGT.trim(),
        maHocPhan: MAHOCPHAN.trim(),
        loai: LOAI.trim(),
        moTa: MOTA?.trim() || null,
        soLuong: Number(SOLUONG),
        donGia: Number(DONGIA)
    }

    if (data.tenGT.length < 3){
        return {isValid: false, status: 400, message: 'Tên giáo trình phải có ít nhất 3 ký tự!'}
    }

    if (!Number.isInteger(data.soLuong) || data.soLuong < 0){
        return {isValid: false, status: 400, message: 'Số lượng phải là số nguyên không âm!'}
    }

    if (!Number.isFinite(data.donGia) || data.donGia < 0){
        return {isValid: false, status: 400, message: 'Đơn giá không hợp lệ!'}
    }

    if (!/^\d{6,20}$/.test(data.maHocPhan)){
        return {isValid: false, status: 400, message: 'Mã học phần không hợp lệ!'}
    }

    const danhSachLoai = ['Bán', 'Tặng', 'Trao đổi']

    if (!danhSachLoai.includes(data.loai)){
        return {isValid: false, status: 400, message: 'Loại giáo trình không hợp lệ!'}
    }

    if (data.loai === 'Bán' && data.donGia <= 0){
        return {isValid: false, status: 400, message: 'Giá bán phải lớn hơn 0!'}
    }

    if (['Tặng', 'Trao đổi'].includes(data.loai) && data.donGia !== 0){
        return {isValid: false, status: 400, message: 'Giá của giáo trình tặng hoặc trao đổi phải bằng 0!'}
    }

    return {isValid: true, data}
}


function validatePublicTextbookListQuery(query = {}) {
    const page = query.page === undefined ? 1 : Number(query.page)
    const limit = query.limit === undefined ? 12 : Number(query.limit)

    if (!Number.isInteger(page) || page <= 0) {
        return {isValid: false, status: 400, message: 'Trang không hợp lệ!'}
    }

    if (!Number.isInteger(limit) || limit <= 0 || limit > 50) {
        return {isValid: false, status: 400, message: 'Số giáo trình mỗi trang phải từ 1 đến 50!'}
    }

    const stringFields = [
        ['tuKhoa', 'Từ khóa tìm kiếm không hợp lệ!'],
        ['maHocPhan', 'Mã học phần không hợp lệ!'],
        ['loai', 'Loại giáo trình không hợp lệ!'],
        ['sapXep', 'Kiểu sắp xếp không hợp lệ!']
    ]

    for (const [field, message] of stringFields) {
        if (query[field] !== undefined && typeof query[field] !== 'string') {
            return {isValid: false, status: 400, message}
        }
    }

    const tuKhoa = typeof query.tuKhoa === 'string' ? query.tuKhoa.trim() : ''
    const maHocPhan = typeof query.maHocPhan === 'string' ? query.maHocPhan.trim() : ''
    const loai = typeof query.loai === 'string' ? query.loai.trim() : ''
    const sapXep = typeof query.sapXep === 'string' ? query.sapXep.trim() : 'moi-nhat'

    if (tuKhoa.length > 300) {
        return {isValid: false, status: 400, message: 'Từ khóa không được vượt quá 300 ký tự!'}
    }

    if (maHocPhan && !/^\d{6,20}$/.test(maHocPhan)) {
        return {isValid: false, status: 400,  message: 'Mã học phần không hợp lệ!'}
    }

    const textbookTypes = [
        'Bán',
        'Tặng',
        'Trao đổi'
    ]

    if (loai && !textbookTypes.includes(loai)) {
        return {isValid: false, status: 400, message: 'Loại giáo trình không hợp lệ!'}
    }

    const sortOptions = [
        'moi-nhat',
        'cu-nhat',
        'gia-thap',
        'gia-cao'
    ]

    if (!sortOptions.includes(sapXep)) {
        return {isValid: false, status: 400, message: 'Kiểu sắp xếp không hợp lệ!'}
    }

    let giaTu = null
    let giaDen = null

    if (query.giaTu !== undefined && query.giaTu !== null && query.giaTu !== '') {
        giaTu = Number(query.giaTu)

        if (!Number.isFinite(giaTu) || giaTu < 0 || giaTu > 999999999999) {
            return {isValid: false, status: 400, message: 'Giá tối thiểu không hợp lệ!'}
        }
    }

    if (query.giaDen !== undefined && query.giaDen !== null && query.giaDen !== '') {
        giaDen = Number(query.giaDen)

        if (!Number.isFinite(giaDen) || giaDen < 0 || giaDen > 999999999999) {
            return {isValid: false, status: 400, message: 'Giá tối đa không hợp lệ!'}
        }
    }

    if (giaTu !== null && giaDen !== null && giaTu > giaDen) {
        return {isValid: false, status: 400, message: 'Giá tối thiểu không được lớn hơn giá tối đa!'}
    }

    return {
        isValid: true,
        data: {
            page,
            limit,
            tuKhoa: tuKhoa || null,
            maHocPhan: maHocPhan || null,
            loai: loai || null,
            giaTu,
            giaDen,
            sapXep
        }
    }
}

module.exports = {validateCreateTextbook, validateUpdateTextbook, validatePublicTextbookListQuery}