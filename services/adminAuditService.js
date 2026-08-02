const {sql} = require('../config/db')


function serializeAuditData(value) {
    if (value === undefined || value === null) {
        return null
    }

    return JSON.stringify(value)
}


function parseAuditData(value) {
    if (value === undefined || value === null) {
        return null
    }

    try {
        return JSON.parse(value)
    }

    catch {
        return null
    }
}


async function insertAdminAuditLog(transaction, data) {
    const request = new sql.Request(transaction)

    request.input('MATK_ADMIN', sql.Int, data.adminId)
    request.input('HANHDONG', sql.NVarChar(100), data.hanhDong)
    request.input('DOITUONG', sql.NVarChar(50), data.doiTuong)
    request.input('MADOITUONG', sql.BigInt, data.maDoiTuong)
    request.input('DULIEUTRUOC', sql.NVarChar(sql.MAX), serializeAuditData(data.duLieuTruoc))
    request.input('DULIEUSAU', sql.NVarChar(sql.MAX), serializeAuditData(data.duLieuSau))
    request.input('LYDO', sql.NVarChar(500), data.lyDo ?? null)
    request.input('IP', sql.VarChar(45), data.ip ?? null)
    request.input('USER_AGENT',  sql.NVarChar(500), data.userAgent ?? null)

    const result = await request.query(`
        INSERT INTO NHATKYQUANTRI(MATK_ADMIN, HANHDONG, DOITUONG, MADOITUONG, DULIEUTRUOC, DULIEUSAU, LYDO, IP, USER_AGENT)

        OUTPUT INSERTED.MANHATKY, INSERTED.MATK_ADMIN, INSERTED.HANHDONG, INSERTED.DOITUONG, INSERTED.MADOITUONG,
               INSERTED.LYDO, INSERTED.IP, INSERTED.USER_AGENT, INSERTED.THOIGIAN

        VALUES (@MATK_ADMIN, @HANHDONG, @DOITUONG, @MADOITUONG, @DULIEUTRUOC, @DULIEUSAU, @LYDO, @IP, @USER_AGENT)`)

    return result.recordset[0]
}


async function getAdminAuditLogs(filters) {
    const request = new sql.Request()
    const offset = (filters.page - 1) * filters.limit

    request.input('MATK_ADMIN', sql.Int, filters.adminId)
    request.input('HANHDONG', sql.NVarChar(100), filters.hanhDong)
    request.input('DOITUONG', sql.NVarChar(50), filters.doiTuong)
    request.input('TUNGAY', sql.Date, filters.tuNgay)
    request.input('DENNGAY', sql.Date, filters.denNgay)
    request.input('OFFSET', sql.Int, offset)
    request.input('LIMIT', sql.Int, filters.limit)

    const result = await request.query(`
        SELECT NK.MANHATKY, NK.MATK_ADMIN, TK.TENTK AS ADMIN_TENTK, TK.MASV AS ADMIN_MASV, NK.HANHDONG,
                NK.DOITUONG, NK.MADOITUONG, JSON_VALUE(NK.DULIEUTRUOC, '$.trangThai') AS TRANGTHAITRUOC,
                JSON_VALUE(NK.DULIEUSAU, '$.trangThai') AS TRANGTHAISAU, NK.LYDO, NK.IP, NK.USER_AGENT,
                NK.THOIGIAN, COUNT(*) OVER() AS TONGSO
        FROM NHATKYQUANTRI NK
        JOIN TAIKHOAN TK ON TK.MATK = NK.MATK_ADMIN
        WHERE
            (
                @MATK_ADMIN IS NULL
                OR NK.MATK_ADMIN = @MATK_ADMIN
            )

            AND
            (
                @HANHDONG IS NULL
                OR NK.HANHDONG = @HANHDONG
            )

            AND
            (
                @DOITUONG IS NULL
                OR NK.DOITUONG = @DOITUONG
            )

            AND
            (
                @TUNGAY IS NULL
                OR NK.THOIGIAN >= @TUNGAY
            )

            AND
            (
                @DENNGAY IS NULL
                OR NK.THOIGIAN <
                    DATEADD(DAY, 1, @DENNGAY)
            )

        ORDER BY
            NK.THOIGIAN DESC,
            NK.MANHATKY DESC

        OFFSET @OFFSET ROWS
        FETCH NEXT @LIMIT ROWS ONLY`)

    const totalItems = result.recordset.length > 0 ? Number(result.recordset[0].TONGSO) : 0
    const items = result.recordset.map(audit => {
        const {
            TONGSO,
            ...auditData
        } = audit

        return auditData
    })

    return {
        items,
        page: filters.page,
        limit: filters.limit,
        totalItems,
        totalPages: Math.ceil(totalItems / filters.limit)
    }
}


async function getAdminAuditDetail(auditId) {
    const request = new sql.Request()

    request.input('MANHATKY', sql.BigInt, auditId)

    const result = await request.query(`
        SELECT NK.MANHATKY, NK.MATK_ADMIN, TK.TENTK AS ADMIN_TENTK, TK.MASV AS ADMIN_MASV,
                NK.HANHDONG, NK.DOITUONG, NK.MADOITUONG, NK.DULIEUTRUOC, NK.DULIEUSAU,
                NK.LYDO, NK.IP, NK.USER_AGENT, NK.THOIGIAN
        FROM NHATKYQUANTRI NK
        JOIN TAIKHOAN TK ON TK.MATK = NK.MATK_ADMIN

        WHERE NK.MANHATKY = @MANHATKY`)

    if (result.recordset.length === 0) {
        const error = new Error('Không tìm thấy nhật ký quản trị!')
        error.status = 404
        throw error
    }

    const audit = result.recordset[0]

    return {
        MANHATKY: audit.MANHATKY,
        MATK_ADMIN: audit.MATK_ADMIN,
        ADMIN_TENTK: audit.ADMIN_TENTK,
        ADMIN_MASV: audit.ADMIN_MASV,
        HANHDONG: audit.HANHDONG,
        DOITUONG: audit.DOITUONG,
        MADOITUONG: audit.MADOITUONG,
        DULIEUTRUOC: parseAuditData(audit.DULIEUTRUOC),
        DULIEUSAU: parseAuditData(audit.DULIEUSAU),
        LYDO: audit.LYDO,
        IP: audit.IP,
        USER_AGENT: audit.USER_AGENT,
        THOIGIAN: audit.THOIGIAN
    }
}


module.exports = {
    insertAdminAuditLog,
    getAdminAuditLogs,
    getAdminAuditDetail
}