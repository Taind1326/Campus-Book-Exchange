const {
    getAdminTextbooks: getAdminTextbooksService,
    getAdminTextbookDetail: getAdminTextbookDetailService
} = require('../services/adminTextbookService')

const {
    hideTextbookWorkflow,
    restoreTextbookWorkflow,
    deleteTextbookWorkflow
} = require('../services/adminTextbookWorkflowService')

const {
    validateAdminTextbookListQuery,
    validateTextbookId,
    validateHideTextbook
} = require('../validators/adminTextbookValidator')


function handleAdminTextbookError(res, error, action) {
    console.log(`Lỗi ${action}:`, error)

    if (error.status) {
        return res.status(error.status).json({message: error.message})
    }

    return res.status(500).json({message: `Không thể ${action}!`})
}


async function getAdminTextbooks(req, res) {
    const validation = validateAdminTextbookListQuery(req.query)

    if (!validation.isValid) {
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        const result = await getAdminTextbooksService(validation.data)

        return res.status(200).json(result)
    }

    catch (error) {
        return handleAdminTextbookError(res, error, 'lấy danh sách bài đăng')
    }
}


async function getAdminTextbookDetail(req, res) {
    const validation = validateTextbookId(req.params.maGT)

    if (!validation.isValid) {
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        const textbook =
            await getAdminTextbookDetailService(validation.data.maGT)

        return res.status(200).json({textbook})
    }

    catch (error) {
        return handleAdminTextbookError(res, error, 'lấy chi tiết bài đăng')
    }
}


async function hideTextbook(req, res) {
    const idValidation = validateTextbookId(req.params.maGT)

    if (!idValidation.isValid) {
        return res.status(idValidation.status).json({message: idValidation.message})
    }

    const bodyValidation = validateHideTextbook(req.body)

    if (!bodyValidation.isValid) {
        return res.status(bodyValidation.status).json({message: bodyValidation.message})
    }

    try {
        const textbook = await hideTextbookWorkflow(idValidation.data.maGT, req.user.MATK, bodyValidation.data, getAuditContext(req))

        return res.status(200).json({message: 'Tạm ẩn bài đăng thành công!', textbook})
    }

    catch (error) {
        return handleAdminTextbookError(res, error, 'tạm ẩn bài đăng')
    }
}


async function restoreTextbook(req, res) {
    const validation = validateTextbookId(req.params.maGT)

    if (!validation.isValid) {
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        const textbook = await restoreTextbookWorkflow(validation.data.maGT, req.user.MATK, getAuditContext(req))

        return res.status(200).json({message: 'Khôi phục bài đăng thành công!', textbook})
    }

    catch (error) {
        return handleAdminTextbookError(res, error, 'khôi phục bài đăng')
    }
}


async function deleteTextbook(req, res) {
    const validation = validateTextbookId(req.params.maGT)

    if (!validation.isValid) {
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        const textbook = await deleteTextbookWorkflow(validation.data.maGT, req.user.MATK, getAuditContext(req))

        return res.status(200).json({message: 'Xóa bài đăng thành công!', textbook})
    }

    catch (error) {
        return handleAdminTextbookError(res, error, 'xóa bài đăng')
    }
}


function getAuditContext(req) {
    const ip = typeof req.ip === 'string' ? req.ip.slice(0, 45) : null
    const userAgent = req.get('user-agent')

    return {
        ip,
        userAgent:
            typeof userAgent === 'string' ? userAgent.slice(0, 500) : null
    }
}



module.exports = {
    getAdminTextbooks,
    getAdminTextbookDetail,
    hideTextbook,
    restoreTextbook,
    deleteTextbook
} 