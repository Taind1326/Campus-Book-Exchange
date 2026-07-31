const {sql} = require('../config/db')

const {
    getAccounts: getAccountsService,
    getAccountById: getAccountByIdService,
    getAccountForUpdate: getAccountForUpdateService,
    restrictAccount: restrictAccountService,
    unrestrictAccount: unrestrictAccountService,
    temporaryLockAccount: temporaryLockAccountService,
    unlockAccount: unlockAccountService,
    permanentLockAccount: permanentLockAccountService
} = require('./adminAccountService')


function createError(message, status) {
    const error = new Error(message)
    error.status = status
    return error
}


function validateAccountTarget(account, adminId) {
    if (account.MATK === adminId) {
        throw createError('Bạn không thể thay đổi trạng thái tài khoản của chính mình!', 403)
    }

    if (account.VAITRO === 'Quản trị viên') {
        throw createError('Không được thay đổi trạng thái tài khoản Quản trị viên!', 403)
    }
}


function formatUpdatedAccount(account) {
    return {
        accountId: account.MATK,
        tenTaiKhoan: account.TENTK,
        vaiTro: account.VAITRO,
        trangThai: account.TRANGTHAI,
        lyDoHanChe: account.LYDOHANCHED,
        hanCheDen: account.HANCHEDEN
    }
}


async function executeAccountUpdate(adminId, accountId, validateState, updateAction) {
    const transaction = new sql.Transaction()
    let transactionStarted = false

    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE)

        transactionStarted = true

        const account = await getAccountForUpdateService(transaction, accountId)

        validateAccountTarget(account, adminId)
        validateState(account)

        const updatedAccount = await updateAction(transaction, account)

        await transaction.commit()
        transactionStarted = false

        return formatUpdatedAccount(updatedAccount)
    }

    catch (error) {
        if (transactionStarted) {
            try {
                await transaction.rollback()
            }

            catch (rollbackError) {
                console.error('Lỗi rollback cập nhật tài khoản:', rollbackError)
            }
        }

        throw error
    }
}


async function getAccountsWorkflow(filters) {
    return getAccountsService(filters)
}


async function getAccountByIdWorkflow(accountId) {
    return getAccountByIdService(accountId)
}


async function restrictAccountWorkflow(adminId, accountId, data) {
    return executeAccountUpdate(adminId, accountId,
        account => {
            if (account.TRANGTHAI !== 'Hoạt động') {
                throw createError('Chỉ tài khoản đang hoạt động mới có thể bị hạn chế!', 409)
            }
        },

        (transaction, account) => restrictAccountService(transaction, account.MATK, data)
    )
}


async function unrestrictAccountWorkflow(adminId, accountId) {
    return executeAccountUpdate(adminId, accountId,

        account => {
            if (account.TRANGTHAI !== 'Bị hạn chế') {
                throw createError('Tài khoản hiện không ở trạng thái bị hạn chế!', 409)
            }
        },

        (transaction, account) => unrestrictAccountService(transaction, account.MATK)
    )
}


async function temporaryLockAccountWorkflow(adminId, accountId, data) {
    return executeAccountUpdate(adminId, accountId,

        account => {
            const validStatuses = [
                'Hoạt động',
                'Bị hạn chế'
            ]

            if (!validStatuses.includes(account.TRANGTHAI)) {
                throw createError('Tài khoản không còn ở trạng thái có thể tạm khóa!', 409)
            }
        },

        (transaction, account) => temporaryLockAccountService(transaction, account.MATK, data)
    )
}


async function unlockAccountWorkflow(adminId, accountId) {
    return executeAccountUpdate(adminId, accountId,

        account => {
            if (account.TRANGTHAI !== 'Tạm khóa') {
                throw createError('Tài khoản hiện không ở trạng thái tạm khóa!', 409)
            }
        },

        (transaction, account) => unlockAccountService(transaction, account.MATK)
    )
}


async function permanentLockAccountWorkflow(adminId, accountId, data) {
    return executeAccountUpdate(adminId, accountId,

        account => {
            if (account.TRANGTHAI === 'Đã khóa') {
                throw createError('Tài khoản đã bị khóa vĩnh viễn!', 409)
            }
        },

        (transaction, account) => permanentLockAccountService(transaction, account.MATK, data)
    )
}


module.exports = {
    getAccountsWorkflow,
    getAccountByIdWorkflow,
    restrictAccountWorkflow,
    unrestrictAccountWorkflow,
    temporaryLockAccountWorkflow,
    unlockAccountWorkflow,
    permanentLockAccountWorkflow
}