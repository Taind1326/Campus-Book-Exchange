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


async function getReportForProcessingWithLock(transaction, maBC) {
    const request = new sql.Request(transaction)

    request.input('MABC', sql.BigInt, maBC)

    const result = await request.query(`
        SELECT MABC, NGUOIBAOCAO, NGUOIBIBAOCAO,
               DOITUONGBAOCAO, MADH, MATN, LOAIBAOCAO,
               TRANGTHAI, NGUOIXULY, KETQUAXULY, NGAYXULY
        FROM BAOCAO WITH (UPDLOCK, HOLDLOCK)
        WHERE MABC = @MABC`)

    if (result.recordset.length === 0) {
        const error = new Error('Không tìm thấy báo cáo!')
        error.status = 404
        throw error
    }

    return result.recordset[0]
}


function validateReportClaim(report, adminId) {
    if (report.NGUOIBAOCAO === adminId || report.NGUOIBIBAOCAO === adminId) {
        const error = new Error('Bạn không thể xử lý báo cáo có liên quan đến tài khoản của mình!')
        error.status = 403
        throw error
    }

    if (report.TRANGTHAI !== 'Chờ xử lý') {
        const error = new Error('Báo cáo này đã được nhận hoặc xử lý trước đó!')
        error.status = 409
        throw error
    }
}


async function claimReport(transaction, maBC, adminId) {
    const request = new sql.Request(transaction)

    request.input('MABC', sql.BigInt, maBC)
    request.input('NGUOIXULY', sql.Int, adminId)

    const result = await request.query(`
        UPDATE BAOCAO
        SET TRANGTHAI = N'Đang xử lý',
            NGUOIXULY = @NGUOIXULY

        OUTPUT INSERTED.MABC, INSERTED.NGUOIBAOCAO, INSERTED.NGUOIBIBAOCAO, INSERTED.DOITUONGBAOCAO,
                INSERTED.MADH, INSERTED.MATN, INSERTED.LOAIBAOCAO, INSERTED.TRANGTHAI, INSERTED.NGUOIXULY,
                INSERTED.KETQUAXULY, INSERTED.NGAYXULY

        WHERE MABC = @MABC
          AND TRANGTHAI = N'Chờ xử lý'
          AND NGUOIXULY IS NULL`)

    if (result.recordset.length === 0) {
        const error = new Error('Báo cáo đã được Admin khác nhận xử lý!')

        error.status = 409
        throw error
    }

    return result.recordset[0]
}


function validateReportResolution(report, adminId) {
    if (report.NGUOIBAOCAO === adminId || report.NGUOIBIBAOCAO === adminId) {
        const error = new Error('Bạn không thể kết luận báo cáo có liên quan đến tài khoản của mình!')
        error.status = 403
        throw error
    }

    if (report.TRANGTHAI !== 'Đang xử lý') {
        const error = new Error('Chỉ báo cáo đang xử lý mới có thể được kết luận!')
        error.status = 409
        throw error
    }

    if (report.NGUOIXULY !== adminId) {
        const error = new Error('Chỉ Admin đã nhận báo cáo mới được quyền kết luận!')
        error.status = 403
        throw error
    }
}


async function resolveReport(transaction, maBC, adminId, data) {
    const request = new sql.Request(transaction)

    request.input('MABC', sql.BigInt, maBC)
    request.input('NGUOIXULY', sql.Int, adminId)
    request.input('KETLUAN', sql.NVarChar(30), data.ketLuan)
    request.input('KETQUAXULY', sql.NVarChar(1000), data.ketQuaXuLy)

    const result = await request.query(`
        UPDATE BAOCAO
        SET TRANGTHAI = @KETLUAN,
            KETQUAXULY = @KETQUAXULY,
            NGAYXULY = SYSDATETIME()

        OUTPUT
            INSERTED.MABC,
            INSERTED.NGUOIBAOCAO,
            INSERTED.NGUOIBIBAOCAO,
            INSERTED.DOITUONGBAOCAO,
            INSERTED.MADH,
            INSERTED.MATN,
            INSERTED.LOAIBAOCAO,
            INSERTED.TRANGTHAI,
            INSERTED.NGUOIXULY,
            INSERTED.KETQUAXULY,
            INSERTED.NGAYXULY

        WHERE MABC = @MABC
          AND TRANGTHAI = N'Đang xử lý'
          AND NGUOIXULY = @NGUOIXULY`)

    if (result.recordset.length === 0) {
        const error = new Error('Báo cáo đã được xử lý hoặc bạn không còn quyền kết luận!')
        error.status = 409
        throw error
    }

    return result.recordset[0]
}


module.exports = {
    getAdminReports,
    getAdminReportDetail,
    getReportForProcessingWithLock,
    validateReportClaim,
    claimReport,
    validateReportResolution,
    resolveReport
}