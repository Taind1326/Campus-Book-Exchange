const {sql} = require('../config/db')

function validateOrder(textbook, nguoiMua, soLuong) {
    if (textbook.NGUOIDANG === nguoiMua) {
        const error = new Error('Bạn không thể mua giáo trình của chính mình!')
        error.status = 403
        throw error
    }

    if (textbook.TRANGTHAI !== 'Đang hiển thị') {
        const error = new Error('Giáo trình hiện tại không thể giao dịch!')
        error.status = 409
        throw error
    }

    const soLuongDangGiu = textbook.SOLUONGDANGGIU ?? 0
    const soLuongConLai = textbook.SOLUONG - soLuongDangGiu

    if (soLuongConLai <= 0) {
        const error = new Error('Giáo trình đã hết số lượng khả dụng!')
        error.status = 409
        throw error
    }

    if (soLuong > soLuongConLai) {
        const error = new Error(`Hiện chỉ còn ${soLuongConLai} giáo trình có thể đặt!`)
        error.status = 409
        throw error
    }
}



async function checkExistingActiveOrder(transaction, maGT, nguoiMua) {
    const request = new sql.Request(transaction)

    request.input('MAGT', sql.Int, maGT)
    request.input('NGUOIMUA', sql.Int, nguoiMua)

    const result = await request.query(`
        SELECT DH.MADH
        FROM DONHANG DH
        JOIN CHITIETDONHANG CT ON DH.MADH = CT.MADH
        WHERE CT.MAGT = @MAGT
            AND DH.NGUOIMUA = @NGUOIMUA
            AND DH.TRANGTHAI IN 
            (
                N'Đang trao đổi',
                N'Đã chốt'
            )`)

    if (result.recordset.length > 0){
        const error = new Error('Bạn đã có yêu cầu giao dịch cho giáo trình này!')
        error.status = 409
        throw error
    }
}


function getTransactionType(loaiTextbook){
    if (loaiTextbook === 'Bán'){
        return 'Mua'
    }

    if (loaiTextbook === 'Tặng'){
        return 'Nhận tặng'
    }

    if (loaiTextbook === 'Trao đổi'){
        return 'Trao đổi'
    }

    const error = new Error('Loại giao dịch không hợp lệ!')
    error.status = 400
    throw error
}


async function getTextbookForOrderWithLock(transaction, maGT) {
    const request = new sql.Request(transaction)

    request.input('MAGT', sql.Int, maGT)

    const result = await request.query(`
        SELECT MAGT, TENGT, MAHOCPHAN, NGUOIDANG,
                SOLUONG, SOLUONGDANGGIU,
                DONGIA, LOAI, TRANGTHAI
        FROM GIAOTRINH WITH (UPDLOCK, HOLDLOCK)
        WHERE MAGT = @MAGT`)

    if (result.recordset.length === 0){
        const error = new Error('Không tìm thấy giáo trình!')
        error.status = 404
        throw error
    }
    return result.recordset[0]
}



async function insertOrder(transaction, textbook, nguoiMua) {
    const request = new sql.Request(transaction)

    request.input('NGUOIMUA', sql.Int, nguoiMua)
    request.input('NGUOIBAN', sql.Int, textbook.NGUOIDANG)
    request.input('LOAIGIAODICH', sql.NVarChar(50), getTransactionType(textbook.LOAI))

    const result = await request.query(`
        INSERT INTO DONHANG (NGUOIMUA, NGUOIBAN, LOAIGIAODICH)
        OUTPUT INSERTED.MADH
        VALUES (@NGUOIMUA, @NGUOIBAN, @LOAIGIAODICH)`)

    return result.recordset[0].MADH
}



async function insertOrderDetail(transaction, maDH, textbook, soLuong) {
    const request = new sql.Request(transaction)

    request.input('MADH', sql.Int, maDH)
    request.input('MAGT', sql.Int, textbook.MAGT)
    request.input('SOLUONG', sql.Int, soLuong)
    request.input('DONGIA', sql.Decimal(12, 0), textbook.DONGIA)

    await request.query(`
        INSERT INTO CHITIETDONHANG (MADH, MAGT, SOLUONG, DONGIA)
        VALUES (@MADH, @MAGT, @SOLUONG, @DONGIA)`)
}



async function getOrderForConfirmationWithLock(transaction, maDH) {
    const request = new sql.Request(transaction)

    request.input('MADH', sql.Int, maDH)

    const result = await request.query(`
        SELECT DH.MADH, DH.NGUOIMUA, DH.NGUOIBAN,
                DH.LOAIGIAODICH, DH.TRANGTHAI,
                CT.MAGT, CT.SOLUONG, CT.DONGIA,
                GT.TENGT, GT.NGUOIDANG,
                GT.SOLUONG AS TONGSOLUONG,
                GT.SOLUONGDANGGIU,
                GT.TRANGTHAI AS TRANGTHAIGIAOTRINH
        FROM DONHANG DH WITH (UPDLOCK, HOLDLOCK)

        JOIN CHITIETDONHANG CT WITH (UPDLOCK, HOLDLOCK) ON CT.MADH = DH.MADH

        JOIN GIAOTRINH GT WITH (UPDLOCK, HOLDLOCK) ON GT.MAGT = CT.MAGT

        WHERE DH.MADH = @MADH`)

    if (result.recordset.length === 0) {
        const error = new Error('Không tìm thấy đơn hàng!')
        error.status = 404
        throw error
    }

    return result.recordset[0]
}


function validateOrderConfirmation(order, nguoiBan) {
    if (order.NGUOIBAN !== nguoiBan) {
        const error = new Error('Bạn không có quyền xác nhận đơn hàng này!')
        error.status = 403
        throw error
    }

    if (order.TRANGTHAI !== 'Đang trao đổi') {
        const error = new Error('Đơn hàng này không còn ở trạng thái chờ xác nhận!')
        error.status = 409
        throw error
    }

    if (order.TRANGTHAIGIAOTRINH !== 'Đang hiển thị') {
        const error = new Error('Giáo trình hiện không thể tiếp tục giao dịch!')
        error.status = 409
        throw error
    }

    const soLuongDangGiu = order.SOLUONGDANGGIU ?? 0
    const soLuongConLai = order.TONGSOLUONG - soLuongDangGiu

    if (order.SOLUONG > soLuongConLai) {
        const error = new Error(`Không đủ số lượng để xác nhận đơn. ` + `Hiện chỉ còn ${soLuongConLai} giáo trình!`)
        error.status = 409
        throw error
    }
}



async function confirmOrderAndHoldQuantity(transaction, order) {
    const textbookRequest = new sql.Request(transaction)

    textbookRequest.input('MAGT', sql.Int, order.MAGT)
    textbookRequest.input('SOLUONG', sql.Int, order.SOLUONG)

    const textbookResult = await textbookRequest.query(`
        UPDATE GIAOTRINH
        SET SOLUONGDANGGIU = ISNULL(SOLUONGDANGGIU, 0) + @SOLUONG,
            TRANGTHAI = CASE WHEN SOLUONG -
                        (
                            ISNULL(SOLUONGDANGGIU, 0)
                            + @SOLUONG
                        ) <= 0
                    THEN N'Đang giao dịch' ELSE N'Đang hiển thị'
                END,

            NGAYCAPNHAT = SYSDATETIME()

        WHERE MAGT = @MAGT
            AND SOLUONG - ISNULL(SOLUONGDANGGIU, 0) >= @SOLUONG`)

    if (textbookResult.rowsAffected[0] !== 1) {
        const error = new Error('Số lượng giáo trình không còn đủ để xác nhận đơn!')
        error.status = 409
        throw error
    }

    const orderRequest = new sql.Request(transaction)

    orderRequest.input('MADH', sql.Int, order.MADH)

    const orderResult = await orderRequest.query(`
        UPDATE DONHANG
        SET TRANGTHAI = N'Đã chốt',
            NGAYCAPNHAT = SYSDATETIME()
        WHERE MADH = @MADH
            AND TRANGTHAI = N'Đang trao đổi'`)

    if (orderResult.rowsAffected[0] !== 1) {
        const error = new Error('Đơn hàng đã được xử lý trước đó!')
        error.status = 409
        throw error
    }
}



async function rejectOrdersExceedingAvailableQuantity(transaction, acceptedOrder) {
    const request = new sql.Request(transaction)

    request.input('MAGT', sql.Int, acceptedOrder.MAGT)
    request.input('MADHDUOCCHON', sql.Int, acceptedOrder.MADH)

    const result = await request.query(`
        UPDATE DH
        SET DH.TRANGTHAI = N'Bị từ chối',
            DH.NGAYCAPNHAT = SYSDATETIME()
        OUTPUT INSERTED.MADH, INSERTED.NGUOIMUA, INSERTED.NGUOIBAN, CT.MAGT, CT.SOLUONG
        FROM DONHANG DH
        JOIN CHITIETDONHANG CT  ON CT.MADH = DH.MADH
        JOIN GIAOTRINH GT ON GT.MAGT = CT.MAGT
        WHERE CT.MAGT = @MAGT
            AND DH.MADH <> @MADHDUOCCHON
            AND DH.TRANGTHAI = N'Đang trao đổi'
            AND CT.SOLUONG >
                (
                    GT.SOLUONG -
                    ISNULL(GT.SOLUONGDANGGIU, 0)
                )`)

    return result.recordset
}



async function getOrdersByUser(nguoiDung, role, page, limit) {
    const request = new sql.Request()
    const userColumn = role === 'buying' ? 'DH.NGUOIMUA' : 'DH.NGUOIBAN'
    const offset = (page - 1) * limit

    request.input('NGUOIDUNG', sql.Int, nguoiDung)
    request.input('OFFSET', sql.Int, offset)
    request.input('LIMIT', sql.Int, limit)

    const result = await request.query(`
        SELECT DH.MADH, DH.NGUOIMUA, DH.NGUOIBAN, DH.LOAIGIAODICH, DH.TRANGTHAI,
                DH.DIADIEMHEN, DH.THOIGIANHEN, DH.NGAYNGUOIBANXACNHAN, DH.HANXACNHAN,
                DH.NGAYHOANTHANH, DH.NGAYTAO, DH.NGAYCAPNHAT, CT.MAGT, CT.SOLUONG, CT.DONGIA,
                GT.TENGT, GT.LOAI, TK_MUA.TENTK AS TENNGUOIMUA, TK_BAN.TENTK AS TENNGUOIBAN,
                COUNT(*) OVER() AS TONGSO
        FROM DONHANG DH
        JOIN CHITIETDONHANG CT ON CT.MADH = DH.MADH
        JOIN GIAOTRINH GT ON GT.MAGT = CT.MAGT
        JOIN TAIKHOAN TK_MUA ON TK_MUA.MATK = DH.NGUOIMUA
        JOIN TAIKHOAN TK_BAN ON TK_BAN.MATK = DH.NGUOIBAN
        WHERE ${userColumn} = @NGUOIDUNG
        ORDER BY
            DH.NGAYCAPNHAT DESC,
            DH.MADH DESC

        OFFSET @OFFSET ROWS
        FETCH NEXT @LIMIT ROWS ONLY`)

    const totalItems = result.recordset.length > 0 ? Number(result.recordset[0].TONGSO) : 0

    const items = result.recordset.map(order => {
        const {TONGSO, ...orderData} = order

        return orderData
    })

    return {
        items,
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit)
    }
}


module.exports = {
    validateOrder, 
    checkExistingActiveOrder, 
    getTransactionType,
    insertOrder,
    insertOrderDetail,
    getTextbookForOrderWithLock,
    getOrderForConfirmationWithLock,
    validateOrderConfirmation,
    confirmOrderAndHoldQuantity,
    rejectOrdersExceedingAvailableQuantity,
    getOrdersByUser
}