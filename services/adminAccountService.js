const { sql } = require('../config/db')

async function getAccounts(filters) {
    const request = new sql.Request()
    const offset = (filters.page - 1) * filters.limit

    request.input('KEYWORD', sql.NVarChar(100), filters.keyword)
    request.input('ROLE', sql.NVarChar(30), filters.role)
    request.input('STATUS', sql.NVarChar(30), filters.status)
    request.input('OFFSET', sql.Int, offset)
    request.input('LIMIT', sql.Int, filters.limit)

    const result = await request.query(`
        SELECT MATK, MASV, EMAIL, TENSV, SDT, TENTK, VAITRO, TRANGTHAI, LYDOHANCHED, HANCHEDEN,
                NGAYXACMINHEMAIL, NGAYTAO, LANCUOIDANGNHAP, DIEMTRUNGBINH, SOLUOTDANHGIA, SOLUOT1SAO, COUNT(*) OVER() AS TONGSO
        FROM V_ADMIN_TAIKHOAN
        WHERE
            (
                @KEYWORD IS NULL
                OR TENTK LIKE N'%' + @KEYWORD + N'%'
                OR TENSV LIKE N'%' + @KEYWORD + N'%'
                OR MASV LIKE '%' + @KEYWORD + '%'
                OR SDT LIKE '%' + @KEYWORD + '%'
                OR EMAIL LIKE '%' + @KEYWORD + '%'
            )
            AND
            (
                @ROLE IS NULL
                OR VAITRO = @ROLE
            )
            AND
            (
                @STATUS IS NULL
                OR TRANGTHAI = @STATUS
            )

        ORDER BY
            MATK DESC

        OFFSET @OFFSET ROWS
        FETCH NEXT @LIMIT ROWS ONLY`)

    const totalItems = result.recordset.length > 0 ? Number(result.recordset[0].TONGSO) : 0
    const items = result.recordset.map(account => {
        const {
            TONGSO,
            ...accountData
        } = account

        return {
            ...accountData,
            DIEMTRUNGBINH: Number(accountData.DIEMTRUNGBINH),
            SOLUOTDANHGIA: Number(accountData.SOLUOTDANHGIA),
            SOLUOT1SAO: Number(accountData.SOLUOT1SAO)
        }
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


async function getAccountById(accountId) {
    const request = new sql.Request()

    request.input('MATK', sql.Int, accountId)

    const result = await request.query(`
        SELECT MATK, MASV, EMAIL, TENSV, SDT, TENTK, VAITRO, TRANGTHAI, LYDOHANCHED, HANCHEDEN,
                NGAYXACMINHEMAIL, NGAYTAO, LANCUOIDANGNHAP, DIEMTRUNGBINH, SOLUOTDANHGIA, SOLUOT1SAO
        FROM V_ADMIN_TAIKHOAN
        WHERE MATK = @MATK`)

    if (result.recordset.length === 0) {
        const error = new Error('Không tìm thấy tài khoản!')
        error.status = 404
        throw error
    }

    const account = result.recordset[0]

    return {
        ...account,
        DIEMTRUNGBINH: Number(account.DIEMTRUNGBINH),
        SOLUOTDANHGIA:  Number(account.SOLUOTDANHGIA),
        SOLUOT1SAO: Number(account.SOLUOT1SAO)
    }
}


async function getAccountForUpdate(transaction, accountId) {
    const request = new sql.Request(transaction)

    request.input('MATK', sql.Int, accountId)

    const result = await request.query(`
        SELECT MATK, TENTK, MASV, VAITRO, TRANGTHAI, LYDOHANCHED, HANCHEDEN
        FROM TAIKHOAN WITH (UPDLOCK, HOLDLOCK)
        WHERE MATK = @MATK`)

    if (result.recordset.length === 0) {
        const error = new Error('Không tìm thấy tài khoản!')
        error.status = 404
        throw error
    }

    return result.recordset[0]
}


async function restrictAccount(transaction, accountId, data) {
    const request = new sql.Request(transaction)

    request.input('MATK', sql.Int, accountId)
    request.input('LYDOHANCHED', sql.NVarChar(500), data.reason)
    request.input('HANCHEDEN', sql.DateTime2, data.restrictedUntil)

    const result = await request.query(`
        UPDATE TAIKHOAN
        SET TRANGTHAI = N'Bị hạn chế',
            LYDOHANCHED = @LYDOHANCHED,
            HANCHEDEN = @HANCHEDEN

        OUTPUT INSERTED.MATK, INSERTED.TENTK, INSERTED.VAITRO, INSERTED.TRANGTHAI,
                INSERTED.LYDOHANCHED, INSERTED.HANCHEDEN

        WHERE MATK = @MATK
          AND TRANGTHAI = N'Hoạt động'`)

    if (result.recordset.length === 0) {
        const error = new Error('Tài khoản không còn ở trạng thái có thể hạn chế!')
        error.status = 409
        throw error
    }

    return result.recordset[0]
}


async function unrestrictAccount(transaction, accountId) {
    const request = new sql.Request(transaction)

    request.input('MATK', sql.Int, accountId)

    const result = await request.query(`
        UPDATE TAIKHOAN
        SET TRANGTHAI = N'Hoạt động',
            LYDOHANCHED = NULL,
            HANCHEDEN = NULL

        OUTPUT INSERTED.MATK, INSERTED.TENTK, INSERTED.VAITRO, INSERTED.TRANGTHAI, INSERTED.LYDOHANCHED, INSERTED.HANCHEDEN

        WHERE MATK = @MATK
          AND TRANGTHAI = N'Bị hạn chế'`)

    if (result.recordset.length === 0) {
        const error = new Error('Tài khoản không còn ở trạng thái bị hạn chế!')
        error.status = 409
        throw error
    }

    return result.recordset[0]
}


async function temporaryLockAccount(transaction, accountId, data) {
    const request = new sql.Request(transaction)

    request.input('MATK', sql.Int, accountId)
    request.input('LYDOHANCHED', sql.NVarChar(500), data.reason)
    request.input('HANCHEDEN', sql.DateTime2, data.restrictedUntil)

    const result = await request.query(`
        UPDATE TAIKHOAN
        SET TRANGTHAI = N'Tạm khóa',
            LYDOHANCHED = @LYDOHANCHED,
            HANCHEDEN = @HANCHEDEN

        OUTPUT INSERTED.MATK, INSERTED.TENTK, INSERTED.VAITRO,
               INSERTED.TRANGTHAI, INSERTED.LYDOHANCHED,
               INSERTED.HANCHEDEN

        WHERE MATK = @MATK
          AND TRANGTHAI IN (
              N'Hoạt động',
              N'Bị hạn chế'
          )`)

    if (result.recordset.length === 0) {
        const error = new Error('Tài khoản không còn ở trạng thái có thể tạm khóa!')
        error.status = 409
        throw error
    }

    return result.recordset[0]
}


async function unlockAccount(transaction, accountId) {
    const request = new sql.Request(transaction)

    request.input('MATK', sql.Int, accountId)

    const result = await request.query(`
        UPDATE TAIKHOAN
        SET TRANGTHAI = N'Hoạt động',
            LYDOHANCHED = NULL,
            HANCHEDEN = NULL

        OUTPUT INSERTED.MATK, INSERTED.TENTK, INSERTED.VAITRO,
               INSERTED.TRANGTHAI, INSERTED.LYDOHANCHED,
               INSERTED.HANCHEDEN

        WHERE MATK = @MATK
          AND TRANGTHAI = N'Tạm khóa'`)

    if (result.recordset.length === 0) {
        const error = new Error('Tài khoản không còn ở trạng thái tạm khóa!')
        error.status = 409
        throw error
    }

    return result.recordset[0]
}


async function permanentLockAccount(transaction, accountId, data) {
    const request = new sql.Request(transaction)

    request.input('MATK', sql.Int, accountId)
    request.input('LYDOHANCHED', sql.NVarChar(500), data.reason)

    const result = await request.query(`
        UPDATE TAIKHOAN
        SET TRANGTHAI = N'Đã khóa',
            LYDOHANCHED = @LYDOHANCHED,
            HANCHEDEN = NULL

        OUTPUT INSERTED.MATK, INSERTED.TENTK, INSERTED.VAITRO,
               INSERTED.TRANGTHAI, INSERTED.LYDOHANCHED,
               INSERTED.HANCHEDEN

        WHERE MATK = @MATK
          AND TRANGTHAI <> N'Đã khóa'`)

    if (result.recordset.length === 0) {
        const error = new Error('Tài khoản đã bị khóa vĩnh viễn!')
        error.status = 409
        throw error
    }

    return result.recordset[0]
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