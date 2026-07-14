function validateCreateTextbook(body, files){
    const {TENGT, SOLUONG, DONGIA, HOCKY, MAHOCPHAN, MOTA, LOAI} = body

    if (TENGT === undefined || SOLUONG === undefined || DONGIA === undefined || HOCKY === undefined || MAHOCPHAN === undefined || LOAI === undefined){
        return {isValid: false, status: 400, message: "Vui lòng nhập đầy đủ thông tin!"}
    }

    if (typeof TENGT !== 'string' || typeof SOLUONG !== 'string' || typeof DONGIA !== 'string' || typeof HOCKY !== 'string' || typeof MAHOCPHAN !== 'string' || typeof LOAI !== 'string' || (MOTA !== undefined && typeof MOTA !== 'string')){
        return {isValid: false, status: 400, message: 'Dữ liệu giáo trình không hợp lệ!'}
    }

    const data = {
        tenGT: TENGT.trim(),
        maHocPhan: MAHOCPHAN.trim(),
        loai: LOAI.trim(),
        moTa: MOTA?.trim() || null,
        soLuong: Number(SOLUONG),
        donGia: Number(DONGIA),
        hocKy: Number(HOCKY)
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

    if (!Number.isInteger(data.hocKy) || data.hocKy < 1 || data.hocKy > 12){
        return {isValid: false, status: 400, message: 'Học kỳ phải từ 1 đến 12'}
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
    const {TENGT, SOLUONG, DONGIA, HOCKY, MAHOCPHAN, MOTA, LOAI} = body

    if (TENGT === undefined || SOLUONG === undefined || DONGIA === undefined || HOCKY === undefined || MAHOCPHAN === undefined || LOAI === undefined){
        return {isValid: false, status: 400, message: "Vui lòng nhập đầy đủ thông tin!"}
    }

    if (typeof TENGT !== 'string' || typeof SOLUONG !== 'string' || typeof DONGIA !== 'string' || typeof HOCKY !== 'string' || typeof MAHOCPHAN !== 'string' || typeof LOAI !== 'string' || (MOTA !== undefined && typeof MOTA !== 'string')){
        return {isValid: false, status: 400, message: 'Dữ liệu giáo trình không hợp lệ!'}
    }

    const data = {
        tenGT: TENGT.trim(),
        maHocPhan: MAHOCPHAN.trim(),
        loai: LOAI.trim(),
        moTa: MOTA?.trim() || null,
        soLuong: Number(SOLUONG),
        donGia: Number(DONGIA),
        hocKy: Number(HOCKY)
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

    if (!Number.isInteger(data.hocKy) || data.hocKy < 1 || data.hocKy > 12){
        return {isValid: false, status: 400, message: 'Học kỳ phải từ 1 đến 12'}
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


module.exports = {validateCreateTextbook, validateUpdateTextbook}