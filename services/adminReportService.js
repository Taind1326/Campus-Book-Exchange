const {sql} = require('../config/db')

async function getAdminReports(filters) {
    const request = new sql.Request()
    const offset = (filters.page - 1) * filters.limit

    request.input('TRANGTHAI', sql.NVarChar(30), filters.trangThai)
    request.input('DOITUONGBAOCAO', sql.NVarChar(30), filters.doiTuongBaoCao)
    request.input('OFFSET', sql.Int, offset)
    request.input('LIMIT', sql.Int, filters.limit)

    const result = await request.query(`
        SELECT MABC, DOITUONGBAOCAO, MADH, MATN, LOAIBAOCAO, TRANGTHAIBAOCAO, NGAYBAOCAO, NGAYXULY,
                MATK_BAOCAO, TENTK_BAOCAO, MASV_BAOCAO, TEN_BAOCAO, MATK_BIBAOCAO, TENTK_BIBAOCAO,
                MASV_BIBAOCAO, TEN_BIBAOCAO, NGUOIXULY, ADMIN_XULY, LOAIGIAODICH, TRANGTHAIDONHANG,
                MAGT_GIAODICH, TENGT_GIAODICH, MACUOC, NOIDUNGTINNHAN, THOIGIANTINNHAN, COUNT(*) OVER() AS TONGSO
        FROM V_ADMIN_BAOCAO
        WHERE (@TRANGTHAI IS NULL OR TRANGTHAIBAOCAO = @TRANGTHAI)
            AND
            (
                @DOITUONGBAOCAO IS NULL
                OR DOITUONGBAOCAO = @DOITUONGBAOCAO
            )

        ORDER BY
            CASE
                WHEN TRANGTHAIBAOCAO = N'Chờ xử lý' THEN 1
                WHEN TRANGTHAIBAOCAO = N'Đang xử lý' THEN 2
                ELSE 3
            END,
            NGAYBAOCAO ASC,
            MABC ASC

        OFFSET @OFFSET ROWS
        FETCH NEXT @LIMIT ROWS ONLY`)

    const totalItems = result.recordset.length > 0 ? Number(result.recordset[0].TONGSO) : 0

    const items = result.recordset.map(report => {
        const {TONGSO, ...reportData} = report

        return reportData
    })

    return {
        items,
        page: filters.page,
        limit: filters.limit,
        totalItems,
        totalPages: Math.ceil(totalItems / filters.limit)
    }
}


async function getAdminReportDetail(maBC) {
    const request = new sql.Request()

    request.input('MABC', sql.BigInt, maBC)

    const result = await request.query(`
        SELECT *
        FROM V_ADMIN_BAOCAO
        WHERE MABC = @MABC `)

    if (result.recordset.length === 0) {
        const error = new Error('Không tìm thấy báo cáo!')
        error.status = 404
        throw error
    }

    return result.recordset[0]
}


module.exports = {
    getAdminReports,
    getAdminReportDetail
}