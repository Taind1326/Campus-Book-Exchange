const {sql} = require('../config/db')


async function getAdminSupports(filters) {
    const request = new sql.Request()
    const offset = (filters.page - 1) * filters.limit

    request.input('LOAIPHANHOI', sql.NVarChar(50), filters.loaiPhanHoi)
    request.input('TRANGTHAI', sql.NVarChar(30), filters.trangThai)
    request.input('MUCDOUUTIEN', sql.NVarChar(20), filters.mucDoUuTien)
    request.input('TUKHOA', sql.NVarChar(300), filters.tuKhoa)
    request.input('TUNGAY', sql.Date, filters.tuNgay)
    request.input('DENNGAY', sql.Date, filters.denNgay)
    request.input('OFFSET', sql.Int, offset)
    request.input('LIMIT', sql.Int, filters.limit)

    const result = await request.query(`
        SELECT MAPHANHOI, LOAIPHANHOI, TIEUDE, MUCDOUUTIEN, TRANGTHAI, NGAYGUI, NGAYCAPNHAT, NGAYXULY,
                MATK_NGUOIGUI, TENTK_NGUOIGUI, MASV, TENSV, NGUOIXULY, ADMIN_XULY, SOLUONGHINH, COUNT(*) OVER() AS TONGSO
        FROM V_ADMIN_PHANHOIHOTRO
        WHERE (@LOAIPHANHOI IS NULL OR LOAIPHANHOI = @LOAIPHANHOI)
            AND
                (
                    @TRANGTHAI IS NULL
                    OR TRANGTHAI = @TRANGTHAI
                )
            AND
                (
                    @MUCDOUUTIEN IS NULL
                    OR MUCDOUUTIEN = @MUCDOUUTIEN
                )
            AND
                (
                    @TUKHOA IS NULL
                    OR TIEUDE LIKE N'%' + @TUKHOA + N'%'
                    OR NOIDUNG LIKE N'%' + @TUKHOA + N'%'
                    OR TENTK_NGUOIGUI LIKE N'%' + @TUKHOA + N'%'
                    OR TENSV LIKE N'%' + @TUKHOA + N'%'
                    OR MASV LIKE '%' + @TUKHOA + '%'
                )
            AND
                (
                    @TUNGAY IS NULL
                    OR NGAYGUI >= @TUNGAY
                )
            AND
                (
                    @DENNGAY IS NULL
                    OR NGAYGUI < DATEADD(DAY, 1, @DENNGAY)
                )

        ORDER BY CASE MUCDOUUTIEN
                WHEN N'Cao' THEN 1
                WHEN N'Trung bình' THEN 2
                WHEN N'Thấp' THEN 3
                ELSE 4
            END,
            CASE TRANGTHAI
                WHEN N'Mới' THEN 1
                WHEN N'Đang xử lý' THEN 2
                WHEN N'Đã phản hồi' THEN 3
                WHEN N'Đã đóng' THEN 4
                WHEN N'Đã hủy' THEN 5
                ELSE 6
            END,
            NGAYGUI ASC,
            MAPHANHOI ASC

        OFFSET @OFFSET ROWS
        FETCH NEXT @LIMIT ROWS ONLY`)

    const totalItems = result.recordset.length > 0 ? Number(result.recordset[0].TONGSO) : 0
    const items = result.recordset.map(support => {
        const {
            TONGSO,
            ...supportData
        } = support

        return {
            ...supportData,
            SOLUONGHINH: Number(
                supportData.SOLUONGHINH
            )
        }
    })

    return {
        items,
        page: filters.page,
        limit: filters.limit,
        totalItems,
        totalPages: Math.ceil(
            totalItems / filters.limit
        )
    }
}


async function getAdminSupportDetail(maPhanHoi) {
    const request = new sql.Request()

    request.input('MAPHANHOI', sql.BigInt, maPhanHoi)

    const result = await request.query(`
        SELECT MAPHANHOI, LOAIPHANHOI, TIEUDE, NOIDUNG, MUCDOUUTIEN, TRANGTHAI, CAUTRALOI,
                NGAYGUI, NGAYCAPNHAT, NGAYXULY, MATK_NGUOIGUI, TENTK_NGUOIGUI, MASV, TENSV,
                SDT, NGUOIXULY, ADMIN_XULY, SOLUONGHINH
        FROM V_ADMIN_PHANHOIHOTRO
        WHERE MAPHANHOI = @MAPHANHOI;

        SELECT MAHINH, MAPHANHOI, DUONGDAN, THUTU, NGAYTAO
        FROM HINHANHPHANHOI
        WHERE MAPHANHOI = @MAPHANHOI
        ORDER BY THUTU ASC;`)

    const support = result.recordsets[0][0]

    if (!support) {
        const error = new Error('Không tìm thấy phản hồi hỗ trợ!')
        error.status = 404
        throw error
    }

    return {
        ...support,
        SOLUONGHINH: Number(
            support.SOLUONGHINH
        ),
        HINHANH: result.recordsets[1]
    }
}


module.exports = {
    getAdminSupports,
    getAdminSupportDetail
}