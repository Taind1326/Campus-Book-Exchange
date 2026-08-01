const {sql} = require('../config/db')


async function getAdminTextbooks(filters) {
    const request = new sql.Request()
    const offset = (filters.page - 1) * filters.limit

    request.input('TUKHOA', sql.NVarChar(300), filters.tuKhoa)
    request.input('MAHOCPHAN', sql.VarChar(20), filters.maHocPhan)
    request.input('LOAI', sql.NVarChar(50), filters.loai)
    request.input('TRANGTHAI', sql.NVarChar(50), filters.trangThai)
    request.input('NGUOIDANG', sql.Int, filters.nguoiDang)
    request.input('TUNGAY', sql.Date, filters.tuNgay)
    request.input('DENNGAY', sql.Date, filters.denNgay)
    request.input('OFFSET', sql.Int, offset)
    request.input('LIMIT', sql.Int, filters.limit)

    const result = await request.query(`
        SELECT MAGT, TENGT, MAHOCPHAN, TENMH, LOAI, SOLUONG, SOLUONGDANGGIU, SOLUONGCONLAI, DONGIA,
                TRANGTHAI, NGAYDANG, NGAYCAPNHAT, MATK, TENTK, MASV, TENSV, ANHDAIDIEN, COUNT(*) OVER() AS TONGSO
        FROM V_ADMIN_GIAOTRINH
        WHERE
            (
                @TUKHOA IS NULL
                OR TENGT LIKE N'%' + @TUKHOA + N'%'
                OR TENMH LIKE N'%' + @TUKHOA + N'%'
                OR TENTK LIKE N'%' + @TUKHOA + N'%'
                OR MASV LIKE '%' + @TUKHOA + '%'
            )
            AND 
                (
                    @MAHOCPHAN IS NULL
                    OR MAHOCPHAN = @MAHOCPHAN
                )

            AND 
                (
                    @LOAI IS NULL
                    OR LOAI = @LOAI
                )

            AND 
                (
                    @TRANGTHAI IS NULL
                    OR TRANGTHAI = @TRANGTHAI
                )

            AND
                (
                    @NGUOIDANG IS NULL
                    OR MATK = @NGUOIDANG
                )

            AND 
                (
                    @TUNGAY IS NULL
                    OR NGAYDANG >= @TUNGAY
                )

            AND 
                (
                    @DENNGAY IS NULL
                    OR NGAYDANG <
                        DATEADD(DAY, 1, @DENNGAY)
                )

        ORDER BY
            NGAYCAPNHAT DESC,
            MAGT DESC

        OFFSET @OFFSET ROWS
        FETCH NEXT @LIMIT ROWS ONLY`)

    const totalItems = result.recordset.length > 0 ? Number(result.recordset[0].TONGSO) : 0
    const items = result.recordset.map(textbook => {
        const {TONGSO, ...textbookData} = textbook

        return textbookData
    })

    return {
        items,
        page: filters.page,
        limit: filters.limit,
        totalItems,
        totalPages:
            Math.ceil(totalItems / filters.limit)
    }
}


async function getAdminTextbookDetail(maGT) {
    const request = new sql.Request()

    request.input('MAGT', sql.Int, maGT)

    const result = await request.query(`
        SELECT MAGT, TENGT, MOTA, MAHOCPHAN, TENMH, LOAI, SOLUONG, SOLUONGDANGGIU, SOLUONGCONLAI,
                DONGIA, TRANGTHAI, NGAYDANG, NGAYCAPNHAT, MATK, TENTK, MASV, TENSV, ANHDAIDIEN
        FROM V_ADMIN_GIAOTRINH
        WHERE MAGT = @MAGT;

        SELECT MAHINH, MAGT, DUONGDAN, PUBLIC_ID, THUTU, NGAYTAO
        FROM HINHANHGIAOTRINH
        WHERE MAGT = @MAGT
        ORDER BY THUTU ASC;


        SELECT DH.MADH, DH.NGUOIMUA, TK_MUA.TENTK AS TENNGUOIMUA, DH.NGUOIBAN, TK_BAN.TENTK AS TENNGUOIBAN,
                DH.LOAIGIAODICH, DH.TRANGTHAI, CT.SOLUONG, CT.DONGIA, DH.NGAYTAO, DH.NGAYCAPNHAT
        FROM DONHANG DH
        JOIN CHITIETDONHANG CT ON CT.MADH = DH.MADH
        JOIN TAIKHOAN TK_MUA ON TK_MUA.MATK = DH.NGUOIMUA
        JOIN TAIKHOAN TK_BAN ON TK_BAN.MATK = DH.NGUOIBAN
        WHERE CT.MAGT = @MAGT
        ORDER BY
            DH.NGAYCAPNHAT DESC,
            DH.MADH DESC;`)

    const textbook = result.recordsets[0][0]

    if (!textbook) {
        const error = new Error('Không tìm thấy giáo trình!')
        error.status = 404
        throw error
    }

    return {
        ...textbook,
        HINHANH: result.recordsets[1],
        DONHANG: result.recordsets[2]
    }
}


async function getTextbookForModerationWithLock(
    transaction,
    maGT
) {
    const request = new sql.Request(transaction)

    request.input('MAGT', sql.Int, maGT)

    const result = await request.query(`
        SELECT GT.MAGT, GT.TENGT, GT.NGUOIDANG,
               GT.LOAI, GT.SOLUONG,
               GT.SOLUONGDANGGIU, GT.TRANGTHAI,
               GT.NGAYCAPNHAT,
               TK.TENTK,
               TK.TRANGTHAI AS TRANGTHAINGUOIDANG
        FROM GIAOTRINH GT WITH (UPDLOCK, HOLDLOCK)
        JOIN TAIKHOAN TK WITH (UPDLOCK, HOLDLOCK)
            ON TK.MATK = GT.NGUOIDANG
        WHERE GT.MAGT = @MAGT
    `)

    if (result.recordset.length === 0) {
        const error = new Error(
            'Không tìm thấy giáo trình!'
        )
        error.status = 404
        throw error
    }

    return result.recordset[0]
}


async function hideTextbook(transaction, maGT) {
    const request = new sql.Request(transaction)

    request.input('MAGT', sql.Int, maGT)

    const result = await request.query(`
        UPDATE GIAOTRINH
        SET TRANGTHAI = N'Tạm ẩn',
            NGAYCAPNHAT = SYSDATETIME()

        OUTPUT INSERTED.MAGT, INSERTED.TENGT,
               INSERTED.NGUOIDANG, INSERTED.LOAI,
               INSERTED.SOLUONG,
               INSERTED.SOLUONGDANGGIU,
               INSERTED.TRANGTHAI,
               INSERTED.NGAYCAPNHAT

        WHERE MAGT = @MAGT
          AND TRANGTHAI IN (
              N'Đang hiển thị',
              N'Hết hàng'
          )
          AND SOLUONGDANGGIU = 0
    `)

    if (result.recordset.length === 0) {
        const error = new Error(
            'Bài đăng không còn ở trạng thái có thể tạm ẩn!'
        )
        error.status = 409
        throw error
    }

    return result.recordset[0]
}


async function restoreTextbook(transaction, maGT) {
    const request = new sql.Request(transaction)

    request.input('MAGT', sql.Int, maGT)

    const result = await request.query(`
        UPDATE GT
        SET GT.TRANGTHAI =
                CASE
                    WHEN GT.SOLUONG -
                         GT.SOLUONGDANGGIU <= 0
                        THEN N'Hết hàng'
                    ELSE N'Đang hiển thị'
                END,
            GT.NGAYCAPNHAT = SYSDATETIME()

        OUTPUT INSERTED.MAGT, INSERTED.TENGT, INSERTED.NGUOIDANG, INSERTED.LOAI, INSERTED.SOLUONG,
               INSERTED.SOLUONGDANGGIU, INSERTED.TRANGTHAI, INSERTED.NGAYCAPNHAT
        FROM GIAOTRINH GT
        JOIN TAIKHOAN TK ON TK.MATK = GT.NGUOIDANG

        WHERE GT.MAGT = @MAGT
          AND GT.TRANGTHAI = N'Tạm ẩn'
          AND TK.TRANGTHAI NOT IN (
              N'Tạm khóa',
              N'Đã khóa'
          )`)

    if (result.recordset.length === 0) {
        const error = new Error('Không thể khôi phục bài đăng!')
        error.status = 409
        throw error
    }

    return result.recordset[0]
}


async function softDeleteTextbook(transaction, maGT) {
    const request = new sql.Request(transaction)

    request.input('MAGT', sql.Int, maGT)

    const result = await request.query(`
        UPDATE GIAOTRINH
        SET TRANGTHAI = N'Đã xóa',
            NGAYCAPNHAT = SYSDATETIME()

        OUTPUT INSERTED.MAGT, INSERTED.TENGT, INSERTED.NGUOIDANG, INSERTED.LOAI, INSERTED.SOLUONG,
               INSERTED.SOLUONGDANGGIU, INSERTED.TRANGTHAI, INSERTED.NGAYCAPNHAT

        WHERE MAGT = @MAGT
          AND TRANGTHAI IN (
              N'Đang hiển thị',
              N'Tạm ẩn',
              N'Hết hàng'
          )
          AND SOLUONGDANGGIU = 0`)

    if (result.recordset.length === 0) {
        const error = new Error('Bài đăng không còn ở trạng thái có thể xóa!')
        error.status = 409
        throw error
    }

    return result.recordset[0]
}


module.exports = {
    getAdminTextbooks,
    getAdminTextbookDetail,
    getTextbookForModerationWithLock,
    hideTextbook,
    restoreTextbook,
    softDeleteTextbook
}