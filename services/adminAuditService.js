const {sql} = require('../config/db')


function serializeAuditData(value) {
    if (value === undefined || value === null) {
        return null
    }

    return JSON.stringify(value)
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


module.exports = {
    insertAdminAuditLog
}