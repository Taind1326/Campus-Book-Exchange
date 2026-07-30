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


module.exports = {
    getAdminTextbooks,
    getAdminTextbookDetail
}