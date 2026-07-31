const {
    getAccountsWorkflow,
    getAccountByIdWorkflow,
    restrictAccountWorkflow,
    unrestrictAccountWorkflow,
    temporaryLockAccountWorkflow,
    unlockAccountWorkflow,
    permanentLockAccountWorkflow
} = require('../services/adminAccountWorkflowService')

const {
    validateAccountId,
    validateGetAccountsQuery,
    validateRestrictAccount,
    validateTemporaryLockAccount,
    validatePermanentLockAccount
} = require('../validators/adminAccountValidator')


function handleAdminAccountError(res, error, action) {
    console.log(`Lỗi ${action}:`, error)

    if (error.status) {
        return res.status(error.status).json({message: error.message})
    }

    return res.status(500).json({message: `Không thể ${action}!`})
}


async function getAccounts(req, res) {
    const validation = validateGetAccountsQuery(req.query)

    if (!validation.isValid) {
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        const result = await getAccountsWorkflow(validation.data)

        return res.status(200).json(result)
    }

    catch (error) {
        return handleAdminAccountError(res, error, 'lấy danh sách tài khoản')
    }
}


async function getAccountById(req, res) {
    const validation = validateAccountId(req.params.accountId)

    if (!validation.isValid) {
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        const account = await getAccountByIdWorkflow(validation.data.accountId)

        return res.status(200).json({account})
    }

    catch (error) {
        return handleAdminAccountError(res, error, 'lấy chi tiết tài khoản')
    }
}


async function restrictAccount(req, res) {
    const idValidation = validateAccountId(req.params.accountId)

    if (!idValidation.isValid) {
        return res.status(idValidation.status).json({message: idValidation.message})
    }

    const bodyValidation = validateRestrictAccount(req.body)

    if (!bodyValidation.isValid) {
        return res.status(bodyValidation.status).json({message: bodyValidation.message})
    }

    try {
        const account = await restrictAccountWorkflow(req.user.MATK, idValidation.data.accountId, bodyValidation.data)

        return res.status(200).json({message: 'Hạn chế tài khoản thành công!', account})
    }

    catch (error) {
        return handleAdminAccountError(res, error, 'hạn chế tài khoản')
    }
}


async function unrestrictAccount(req, res) {
    const validation = validateAccountId(req.params.accountId)

    if (!validation.isValid) {
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        const account = await unrestrictAccountWorkflow(req.user.MATK, validation.data.accountId)

        return res.status(200).json({message: 'Bỏ hạn chế tài khoản thành công!', account})
    }

    catch (error) {
        return handleAdminAccountError(res, error, 'bỏ hạn chế tài khoản')
    }
}


async function temporaryLockAccount(req, res) {
    const idValidation = validateAccountId(req.params.accountId)

    if (!idValidation.isValid) {
        return res.status(idValidation.status).json({message: idValidation.message})
    }

    const bodyValidation = validateTemporaryLockAccount(req.body)

    if (!bodyValidation.isValid) {
        return res.status(bodyValidation.status).json({message: bodyValidation.message})
    }

    try {
        const account = await temporaryLockAccountWorkflow(req.user.MATK, idValidation.data.accountId, bodyValidation.data)

        return res.status(200).json({message: 'Tạm khóa tài khoản thành công!', account})
    }

    catch (error) {
        return handleAdminAccountError(res, error, 'tạm khóa tài khoản')
    }
}


async function unlockAccount(req, res) {
    const validation = validateAccountId(req.params.accountId)

    if (!validation.isValid) {
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        const account = await unlockAccountWorkflow(req.user.MATK, validation.data.accountId)

        return res.status(200).json({message: 'Mở khóa tài khoản thành công!', account})
    }

    catch (error) {
        return handleAdminAccountError(res, error, 'mở khóa tài khoản')
    }
}


async function permanentLockAccount(req, res) {
    const idValidation = validateAccountId(req.params.accountId)

    if (!idValidation.isValid) {
        return res.status(idValidation.status).json({message: idValidation.message})
    }

    const bodyValidation = validatePermanentLockAccount(req.body)

    if (!bodyValidation.isValid) {
        return res.status(bodyValidation.status).json({message: bodyValidation.message})
    }

    try {
        const account = await permanentLockAccountWorkflow(req.user.MATK, idValidation.data.accountId, bodyValidation.data)

        return res.status(200).json({message: 'Khóa vĩnh viễn tài khoản thành công!', account})
    }

    catch (error) {
        return handleAdminAccountError(res, error, 'khóa vĩnh viễn tài khoản')
    }
}


module.exports = {
    getAccounts,
    getAccountById,
    restrictAccount,
    unrestrictAccount,
    temporaryLockAccount,
    unlockAccount,
    permanentLockAccount
}