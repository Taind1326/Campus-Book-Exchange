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
                N'Đã chốt',
                N'Chờ xác nhận',
                N'Tranh chấp'
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
        SELECT GT.MAGT, GT.TENGT, GT.MAHOCPHAN, GT.NGUOIDANG, GT.SOLUONG,
                GT.SOLUONGDANGGIU, GT.DONGIA, GT.LOAI, GT.TRANGTHAI,
            (
                SELECT COUNT(*)
                FROM HINHANHGIAOTRINH HA
                WHERE HA.MAGT = GT.MAGT
            ) AS SOLUONGHINH

        FROM GIAOTRINH GT WITH (UPDLOCK, HOLDLOCK)
        WHERE GT.MAGT = @MAGT`)

    if (result.recordset.length === 0) {
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
        SELECT DH.MADH, DH.NGUOIMUA, DH.NGUOIBAN, DH.NGAYNGUOIBANXACNHAN,
        DH.HANXACNHAN, DH.NGAYHOANTHANH,

        CASE
            WHEN DH.HANXACNHAN IS NOT NULL
             AND DH.HANXACNHAN <= SYSDATETIME()
            THEN 1
            ELSE 0
        END AS DAHETHAN,

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


async function getOrderDetail(maDH, nguoiDung) {
    const request = new sql.Request()

    request.input('MADH', sql.Int, maDH)
    request.input('NGUOIDUNG', sql.Int, nguoiDung)

    const result = await request.query(`
        SELECT DH.MADH, DH.NGUOIMUA, DH.NGUOIBAN, DH.LOAIGIAODICH, DH.TRANGTHAI, DH.DIADIEMHEN, DH.THOIGIANHEN,
                DH.NGAYNGUOIBANXACNHAN, DH.HANXACNHAN, DH.NGAYHOANTHANH, DH.NGAYTAO, DH.NGAYCAPNHAT,
                CT.MAGT, CT.SOLUONG, CT.DONGIA, GT.TENGT, GT.LOAI, GT.TRANGTHAI AS TRANGTHAIGIAOTRINH,
                DX.MAGTDUOCDOI, DX.MAGTMANGDOI, DX.SOLUONGMANGDOI, GT_MANGDOI.TENGT AS TENGTMANGDOI,
                GT_MANGDOI.SOLUONG AS SOLUONGCONLAIMANGDOI, GT_MANGDOI.SOLUONGDANGGIU AS SOLUONGDANGGIUMANGDOI,
                GT_MANGDOI.TRANGTHAI AS TRANGTHAIMANGDOI, TK_MUA.TENTK AS TENNGUOIMUA, TK_BAN.TENTK AS TENNGUOIBAN, C.MACUOC
        FROM DONHANG DH
        JOIN CHITIETDONHANG CT ON CT.MADH = DH.MADH
        JOIN GIAOTRINH GT ON GT.MAGT = CT.MAGT
        JOIN TAIKHOAN TK_MUA ON TK_MUA.MATK = DH.NGUOIMUA
        JOIN TAIKHOAN TK_BAN ON TK_BAN.MATK = DH.NGUOIBAN
        LEFT JOIN CUOCTROCHUYEN C ON C.MADH = DH.MADH
        LEFT JOIN DEXUATTRAODOI DX ON DX.MADH = DH.MADH
        LEFT JOIN GIAOTRINH GT_MANGDOI ON GT_MANGDOI.MAGT = DX.MAGTMANGDOI
        WHERE DH.MADH = @MADH
        AND (
            DH.NGUOIMUA = @NGUOIDUNG
            OR DH.NGUOIBAN = @NGUOIDUNG)`)

    if (result.recordset.length === 0) {
        const error = new Error('Không tìm thấy đơn hàng hoặc bạn không có quyền xem!')
        error.status = 404
        throw error
    }

    return result.recordset[0]
}


function validateOrderRejection(order, nguoiBan) {
    if (order.NGUOIBAN !== nguoiBan) {
        const error = new Error('Bạn không có quyền từ chối đơn hàng này!')
        error.status = 403
        throw error
    }

    if (order.TRANGTHAI !== 'Đang trao đổi') {
        const error = new Error('Chỉ có thể từ chối đơn đang trao đổi!')
        error.status = 409
        throw error
    }
}



async function rejectOrder(transaction, maDH) {
    const request = new sql.Request(transaction)

    request.input('MADH', sql.Int, maDH)

    const result = await request.query(`
        UPDATE DONHANG
        SET TRANGTHAI = N'Bị từ chối',
            NGAYCAPNHAT = SYSDATETIME()

        WHERE MADH = @MADH
          AND TRANGTHAI = N'Đang trao đổi'`)

    if (result.rowsAffected[0] !== 1) {
        const error = new Error('Đơn hàng đã được xử lý trước đó!')
        error.status = 409
        throw error
    }
}



function validateOrderCancellation(order, nguoiDung) {
    const isParticipant = order.NGUOIMUA === nguoiDung || order.NGUOIBAN === nguoiDung

    if (!isParticipant) {
        const error = new Error('Bạn không có quyền hủy đơn hàng này!')
        error.status = 403
        throw error
    }

    const cancellableStatuses = [
        'Đang trao đổi',
        'Đã chốt',
        'Chờ xác nhận'
    ]

    if (!cancellableStatuses.includes(order.TRANGTHAI)) {
        const error = new Error('Đơn hàng ở trạng thái hiện tại không thể hủy!')
        error.status = 409
        throw error
    }
}



async function cancelOrderAndReleaseQuantity(transaction, order) {
    if (order.TRANGTHAI !== 'Đang trao đổi') {
        const textbookRequest = new sql.Request(transaction)

        textbookRequest.input('MAGT', sql.Int, order.MAGT)
        textbookRequest.input('SOLUONG', sql.Int, order.SOLUONG)

        const textbookResult = await textbookRequest.query(`
                UPDATE GIAOTRINH
                SET SOLUONGDANGGIU = SOLUONGDANGGIU - @SOLUONG,
                    TRANGTHAI = CASE WHEN TRANGTHAI IN (
                                N'Tạm ẩn',
                                N'Đã xóa'
                            )
                                THEN TRANGTHAI

                            WHEN SOLUONG = 0 THEN N'Hết hàng'
                            WHEN SOLUONG - (SOLUONGDANGGIU -  @SOLUONG) > 0 THEN N'Đang hiển thị'

                            ELSE N'Đang giao dịch'
                        END,

                    NGAYCAPNHAT = SYSDATETIME()

                WHERE MAGT = @MAGT
                  AND SOLUONGDANGGIU >= @SOLUONG`)

        if (textbookResult.rowsAffected[0] !== 1) {
            const error = new Error('Dữ liệu số lượng đang giữ không hợp lệ!')
            error.status = 409
            throw error
        }
    }

    const orderRequest = new sql.Request(transaction)

    orderRequest.input('MADH', sql.Int, order.MADH)
    orderRequest.input('TRANGTHAICU', sql.NVarChar(50), order.TRANGTHAI)

    const orderResult = await orderRequest.query(`
        UPDATE DONHANG
        SET TRANGTHAI = N'Đã hủy',
            NGAYCAPNHAT = SYSDATETIME()

        WHERE MADH = @MADH
          AND TRANGTHAI = @TRANGTHAICU`)

    if (orderResult.rowsAffected[0] !== 1) {
        const error = new Error('Đơn hàng đã được xử lý trước đó!')
        error.status = 409
        throw error
    }
}


function validateOrderDelivery(order, nguoiBan) {
    if (order.NGUOIBAN !== nguoiBan) {
        const error = new Error('Bạn không có quyền xác nhận đã giao đơn hàng này!')
        error.status = 403
        throw error
    }

    if (order.TRANGTHAI !== 'Đã chốt') {
        const error = new Error('Chỉ đơn đã chốt mới có thể xác nhận đã giao!')
        error.status = 409
        throw error
    }
}


async function markOrderAsDelivered(transaction, maDH) {
    const request = new sql.Request(transaction)

    request.input('MADH', sql.Int, maDH)

    const result = await request.query(`
        DECLARE @THOIGIAN DATETIME2 = SYSDATETIME();

        UPDATE DONHANG
        SET TRANGTHAI = N'Chờ xác nhận',
            NGAYNGUOIBANXACNHAN = @THOIGIAN,
            HANXACNHAN = DATEADD(HOUR, 72, @THOIGIAN),
            NGAYCAPNHAT = @THOIGIAN
        OUTPUT
            INSERTED.NGAYNGUOIBANXACNHAN,
            INSERTED.HANXACNHAN
        WHERE MADH = @MADH
          AND TRANGTHAI = N'Đã chốt'`)

    if (result.recordset.length === 0) {
        const error = new Error('Đơn hàng đã được xử lý trước đó!')
        error.status = 409
        throw error
    }

    return result.recordset[0]
}



function validateOrderReceipt(order, nguoiMua) {
    if (order.NGUOIMUA !== nguoiMua) {
        const error = new Error('Bạn không có quyền xác nhận đã nhận đơn hàng này!')
        error.status = 403
        throw error
    }

    if (order.TRANGTHAI !== 'Chờ xác nhận') {
        const error = new Error('Chỉ đơn đang chờ xác nhận mới có thể xác nhận đã nhận!')
        error.status = 409
        throw error
    }

    if (!order.NGAYNGUOIBANXACNHAN || !order.HANXACNHAN) {
        const error = new Error('Dữ liệu thời hạn xác nhận của đơn hàng không hợp lệ!')
        error.status = 409
        throw error
    }

    if (Number(order.DAHETHAN) === 1) {
        const error = new Error('Đơn hàng đã hết thời hạn xác nhận!')
        error.status = 409
        throw error
    }
}


async function completeOrderAndDeductQuantity(transaction, order) {
    const textbookRequest = new sql.Request(transaction)

    textbookRequest.input('MAGT', sql.Int, order.MAGT)
    textbookRequest.input('SOLUONG', sql.Int, order.SOLUONG)

    const textbookResult = await textbookRequest.query(`
        UPDATE GIAOTRINH
        SET SOLUONG = SOLUONG - @SOLUONG,
            SOLUONGDANGGIU = SOLUONGDANGGIU - @SOLUONG,

            TRANGTHAI = CASE
                WHEN TRANGTHAI IN (N'Tạm ẩn', N'Đã xóa') THEN TRANGTHAI
                WHEN SOLUONG - @SOLUONG = 0 THEN N'Hết hàng'
                WHEN (SOLUONG - @SOLUONG) - (SOLUONGDANGGIU - @SOLUONG) > 0 THEN N'Đang hiển thị'
                ELSE N'Đang giao dịch'
            END,

            NGAYCAPNHAT = SYSDATETIME()

        WHERE MAGT = @MAGT
          AND SOLUONG >= @SOLUONG
          AND SOLUONGDANGGIU >= @SOLUONG`)

    if (textbookResult.rowsAffected[0] !== 1) {
        const error = new Error('Dữ liệu số lượng giáo trình không hợp lệ!')
        error.status = 409
        throw error
    }

    const orderRequest = new sql.Request(transaction)

    orderRequest.input('MADH', sql.Int, order.MADH)

    const orderResult = await orderRequest.query(`
        UPDATE DONHANG
        SET TRANGTHAI = N'Hoàn tất',
            NGAYHOANTHANH = SYSDATETIME(),
            NGAYCAPNHAT = SYSDATETIME()

        OUTPUT INSERTED.NGAYHOANTHANH

        WHERE MADH = @MADH
          AND TRANGTHAI = N'Chờ xác nhận'`)

    if (orderResult.recordset.length === 0) {
        const error = new Error('Đơn hàng đã được xử lý trước đó!')
        error.status = 409
        throw error
    }

    return orderResult.recordset[0]
}


function validateOrderIssue(order, nguoiMua) {
    if (order.NGUOIMUA !== nguoiMua) {
        const error = new Error('Chỉ người mua mới có quyền báo có vấn đề!')
        error.status = 403
        throw error
    }

    if (order.TRANGTHAI !== 'Chờ xác nhận') {
        const error = new Error('Chỉ đơn đang chờ xác nhận mới có thể báo có vấn đề!')
        error.status = 409
        throw error
    }

    if (!order.NGAYNGUOIBANXACNHAN || !order.HANXACNHAN) {
        const error = new Error('Dữ liệu thời hạn xác nhận của đơn hàng không hợp lệ!')
        error.status = 409
        throw error
    }
}


async function markOrderAsDisputed(transaction, maDH) {
    const request = new sql.Request(transaction)

    request.input('MADH', sql.Int, maDH)

    const result = await request.query(`
        UPDATE DONHANG
        SET TRANGTHAI = N'Tranh chấp',
            NGAYCAPNHAT = SYSDATETIME()

        WHERE MADH = @MADH
          AND TRANGTHAI = N'Chờ xác nhận'
          AND HANXACNHAN >= SYSDATETIME()`)

    if (result.rowsAffected[0] !== 1) {
        const error = new Error('Đã hết thời hạn báo có vấn đề hoặc đơn hàng đã được xử lý!')
        error.status = 409
        throw error
    }
}


async function completeDisputedOrderAndDeductQuantity(transaction, order) {
    const textbookRequest = new sql.Request(transaction)

    textbookRequest.input('MAGT', sql.Int, order.MAGT)
    textbookRequest.input('SOLUONG', sql.Int, order.SOLUONG)

    const textbookResult =
        await textbookRequest.query(`
            UPDATE GIAOTRINH
            SET SOLUONG = SOLUONG - @SOLUONG,
                SOLUONGDANGGIU = SOLUONGDANGGIU - @SOLUONG,

                TRANGTHAI = CASE
                    WHEN TRANGTHAI IN (
                        N'Tạm ẩn',
                        N'Đã xóa'
                    )
                        THEN TRANGTHAI

                    WHEN SOLUONG - @SOLUONG = 0 THEN N'Hết hàng'

                    WHEN
                        (SOLUONG - @SOLUONG) -
                        (SOLUONGDANGGIU - @SOLUONG) > 0
                        THEN N'Đang hiển thị'

                    ELSE N'Đang giao dịch'
                END,

                NGAYCAPNHAT = SYSDATETIME()

            WHERE MAGT = @MAGT
              AND SOLUONG >= @SOLUONG
              AND SOLUONGDANGGIU >= @SOLUONG`)

    if (textbookResult.rowsAffected[0] !== 1) {
        const error = new Error('Dữ liệu số lượng giáo trình không hợp lệ!')
        error.status = 409
        throw error
    }

    const orderRequest = new sql.Request(transaction)

    orderRequest.input('MADH', sql.Int, order.MADH)

    const orderResult = await orderRequest.query(`
        UPDATE DONHANG
        SET TRANGTHAI = N'Hoàn tất',
            NGAYHOANTHANH = SYSDATETIME(),
            NGAYCAPNHAT = SYSDATETIME()

        OUTPUT INSERTED.NGAYHOANTHANH

        WHERE MADH = @MADH
          AND TRANGTHAI = N'Tranh chấp'`)

    if (orderResult.recordset.length === 0) {
        const error = new Error('Đơn tranh chấp đã được xử lý trước đó!')
        error.status = 409
        throw error
    }

    return orderResult.recordset[0]
}



async function getExpiredOrderIds(limit = 50) {
    const request = new sql.Request()

    request.input('LIMIT', sql.Int, limit)

    const result = await request.query(`
        SELECT TOP (@LIMIT) MADH
        FROM DONHANG
        WHERE TRANGTHAI = N'Chờ xác nhận'
          AND HANXACNHAN IS NOT NULL
          AND HANXACNHAN <= SYSDATETIME()
        ORDER BY HANXACNHAN ASC, MADH ASC`)

    return result.recordset.map(order => Number(order.MADH))
}


function validateExpiredOrderCompletion(order) {
    if (!order) {
        const error = new Error('Không tìm thấy đơn hàng!')
        error.status = 404
        throw error
    }

    if (order.TRANGTHAI !== 'Chờ xác nhận') {
        const error = new Error('Đơn hàng không còn ở trạng thái chờ xác nhận!')
        error.status = 409
        throw error
    }

    if (!order.HANXACNHAN) {
        const error = new Error('Đơn hàng chưa có hạn xác nhận!')
        error.status = 409
        throw error
    }

    if (Number(order.DAHETHAN) !== 1) {
        const error = new Error('Đơn hàng chưa hết hạn xác nhận!')
        error.status = 409
        throw error
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
    getOrdersByUser,
    getOrderDetail,
    validateOrderRejection,
    rejectOrder,
    validateOrderCancellation,
    cancelOrderAndReleaseQuantity,
    validateOrderDelivery,
    markOrderAsDelivered,
    validateOrderReceipt,
    completeOrderAndDeductQuantity,
    validateOrderIssue,
    markOrderAsDisputed,
    completeDisputedOrderAndDeductQuantity,
    getExpiredOrderIds,
    validateExpiredOrderCompletion
}