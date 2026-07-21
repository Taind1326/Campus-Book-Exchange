const { sql } = require('../config/db')

async function getAccounts(
    {
        keyword, role, status, page, limit
    })
    
    {
        let query = `
            SELECT *
            FROM V_ADMIN_TAIKHOAN
            WHERE 1 = 1`

    const request = new sql.Request()

    if (keyword){
        query += `
            AND (
                TENTK LIKE @keyword
                OR TENSV LIKE @keyword
                OR MASV LIKE @keyword
                OR SDT LIKE @keyword
            )`

        request.input('keyword', sql.NVarChar, `%${keyword}%`)
    }

    if (role){
        query += `AND VAITRO = @role`

        request.input('role', sql.NVarChar, role)
    }

    if (status){
        query += `
            AND TRANGTHAI = @status`

        request.input('status', sql.NVarChar, status)
    }

    query += `
        ORDER BY MATK DESC
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY`

    request.input('offset', sql.Int, (page - 1) * limit)

    request.input('limit', sql.Int, limit)

    const result = await request.query(query)

    return result.recordset
}



async function getAccountById(accountId){

    const result = await sql.query`
        SELECT *
        FROM V_ADMIN_TAIKHOAN
        WHERE MATK = ${accountId}`

    return result.recordset[0]
}



async function getAccountForUpdate(accountId){

    const result = await sql.query`
        SELECT *
        FROM TAIKHOAN
        WHERE MATK = ${accountId}`

    return result.recordset[0]
}



async function restrictAccount(accountId, reason, restrictedUntil){

    await sql.query`
        UPDATE TAIKHOAN
        SET TRANGTHAI = N'Bị hạn chế',
            LYDOHANCHED = ${reason},
            HANCHEDEN = ${restrictedUntil}
        WHERE MATK = ${accountId}`
}


async function unrestrictAccount(accountId){

    await sql.query`
        UPDATE TAIKHOAN
        SET TRANGTHAI = N'Hoạt động',
            LYDOHANCHED = NULL,
            HANCHEDEN = NULL
        WHERE MATK = ${accountId}`
}


async function temporaryLockAccount(accountId){

    await sql.query`
        UPDATE TAIKHOAN
        SET TRANGTHAI = N'Tạm khóa'
        WHERE MATK = ${accountId}`
}



async function unlockAccount(accountId){

    await sql.query`
        UPDATE TAIKHOAN
        SET TRANGTHAI = N'Hoạt động'
        WHERE MATK = ${accountId}`
}



async function permanentLockAccount(accountId){

    await sql.query`
        UPDATE TAIKHOAN
        SET TRANGTHAI = N'Đã khóa'
        WHERE MATK = ${accountId}`
}



module.exports = {
    getAccounts,
    getAccountById,
    getAccountForUpdate,
    restrictAccount,
    unrestrictAccount,
    temporaryLockAccount,
    unlockAccount,
    permanentLockAccount
}