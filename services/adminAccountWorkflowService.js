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


function createError(message, status){
    const error = new Error(message)
    error.status = status

    return error
}


async function getAccountsWorkflow(filters){
    return await getAccountsService(filters)
}


async function getAccountByIdWorkflow(accountId){
    const account = await getAccountByIdService(accountId)

    if (!account){
        throw createError('Tài khoản không tồn tại!', 404)
    }

    return account
}


async function restrictAccountWorkflow(adminId, accountId, reason, restrictedUntil){
    const account = await getAccountForUpdateService(accountId)

    if (!account){
        throw createError('Tài khoản không tồn tại!', 404)
    }

    if (adminId === accountId){
        throw createError('Bạn không thể tự hạn chế tài khoản của chính mình!',400)
    }

    if (account.TRANGTHAI === 'Đã khóa'){
        throw createError('Không thể hạn chế tài khoản đã bị khóa!', 400)
    }

    if (account.TRANGTHAI === 'Tạm khóa'){
        throw createError('Không thể hạn chế tài khoản đang bị tạm khóa!', 400)
    }

    if (account.TRANGTHAI === 'Bị hạn chế'){
        throw createError('Tài khoản này đã bị hạn chế!', 400)
    }

    await restrictAccountService(accountId, reason, restrictedUntil)

    return {
        message: 'Hạn chế tài khoản thành công!'
    }
}


async function unrestrictAccountWorkflow(accountId){
    const account = await getAccountForUpdateService(accountId)

    if (!account){
        throw createError('Tài khoản không tồn tại!', 404)
    }

    if (account.TRANGTHAI !== 'Bị hạn chế'){
        throw createError('Tài khoản hiện không bị hạn chế!', 400)
    }

    await unrestrictAccountService(accountId)

    return {
        message: 'Bỏ hạn chế tài khoản thành công!'
    }
}


async function temporaryLockAccountWorkflow(adminId, accountId){
    const account = await getAccountForUpdateService(accountId)

    if (!account){
        throw createError('Tài khoản không tồn tại!', 404)
    }

    if (adminId === accountId){
        throw createError('Bạn không thể tự tạm khóa tài khoản của chính mình!', 400)
    }

    if (account.TRANGTHAI === 'Đã khóa'){
        throw createError('Tài khoản đã bị khóa vĩnh viễn!', 400)
    }

    if (account.TRANGTHAI === 'Tạm khóa'){
        throw createError('Tài khoản này đã bị tạm khóa!', 400)
    }

    await temporaryLockAccountService(accountId)

    return {
        message: 'Tạm khóa tài khoản thành công!'
    }
}


async function unlockAccountWorkflow(accountId){
    const account = await getAccountForUpdateService(accountId)

    if (!account){
        throw createError('Tài khoản không tồn tại!', 404)
    }

    if (account.TRANGTHAI === 'Đã khóa'){
        throw createError('Không thể mở tài khoản đã bị khóa vĩnh viễn!', 400)
    }

    if (account.TRANGTHAI !== 'Tạm khóa'){
        throw createError('Tài khoản hiện không bị tạm khóa!', 400)
    }

    await unlockAccountService(accountId)

    return {
        message: 'Mở khóa tài khoản thành công!'
    }
}


async function permanentLockAccountWorkflow(adminId, accountId){
    const account = await getAccountForUpdateService(accountId)

    if (!account){
        throw createError('Tài khoản không tồn tại!', 404)
    }

    if (adminId === accountId){
        throw createError('Bạn không thể tự khóa vĩnh viễn tài khoản của chính mình!', 400)
    }

    if (account.TRANGTHAI === 'Đã khóa'){
        throw createError('Tài khoản này đã bị khóa vĩnh viễn!', 400)
    }

    await permanentLockAccountService(accountId)

    return {
        message: 'Khóa vĩnh viễn tài khoản thành công!'
    }
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