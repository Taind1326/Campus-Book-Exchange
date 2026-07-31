const {
    getAdminSupports: getAdminSupportsService,
    getAdminSupportDetail: getAdminSupportDetailService
} = require('../services/adminSupportService')

const {
    validateAdminSupportListQuery,
    validateSupportId,
    validateSupportPriority
} = require('../validators/adminSupportValidator')


const {
    assignSupportWorkflow,
    updateSupportPriorityWorkflow
} = require('../services/adminSupportWorkflowService')


function handleAdminSupportError(res, error, action) {
    console.log(`Lỗi ${action}:`, error)

    if (error.status) {
        return res.status(error.status).json({message: error.message})
    }

    return res.status(500).json({message: `Không thể ${action}!`})
}


async function getAdminSupports(req, res) {
    const validation = validateAdminSupportListQuery(req.query)

    if (!validation.isValid) {
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        const result = await getAdminSupportsService(validation.data)

        return res.status(200).json(result)
    }

    catch (error) {
        return handleAdminSupportError(res, error, 'lấy danh sách phản hồi hỗ trợ')
    }
}


async function getAdminSupportDetail(req, res) {
    const validation = validateSupportId(req.params.maPhanHoi)

    if (!validation.isValid) {
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        const support = await getAdminSupportDetailService(validation.data.maPhanHoi)

        return res.status(200).json({support})
    }

    catch (error) {
        return handleAdminSupportError(res, error, 'lấy chi tiết phản hồi hỗ trợ')
    }
}


async function assignSupport(req, res) {
    const validation = validateSupportId(req.params.maPhanHoi)

    if (!validation.isValid) {
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        const support = await assignSupportWorkflow(validation.data.maPhanHoi, req.user.MATK)

        return res.status(200).json({message: 'Nhận xử lý phản hồi thành công!', support})
    }

    catch (error) {
        return handleAdminSupportError(res, error, 'nhận xử lý phản hồi')
    }
}


async function updateSupportPriority(req, res) {
    const idValidation = validateSupportId(req.params.maPhanHoi)

    if (!idValidation.isValid) {
        return res.status(idValidation.status).json({message: idValidation.message})
    }

    const bodyValidation = validateSupportPriority(req.body)

    if (!bodyValidation.isValid) {
        return res.status(bodyValidation.status).json({message: bodyValidation.message})
    }

    try {
        const support = await updateSupportPriorityWorkflow(idValidation.data.maPhanHoi, bodyValidation.data)

        return res.status(200).json({message: 'Cập nhật mức ưu tiên thành công!', support})
    }

    catch (error) {
        return handleAdminSupportError(res, error, 'cập nhật mức ưu tiên phản hồi')
    }
}


module.exports = {
    getAdminSupports,
    getAdminSupportDetail,
    assignSupport,
    updateSupportPriority
}