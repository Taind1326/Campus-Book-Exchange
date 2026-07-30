const {
    createSupport: createSupportWorkflow,
    cancelSupportWorkflow
} = require('../services/supportWorkflowService')

const {
    getMySupports: getMySupportsService,
    getMySupportDetail: getMySupportDetailService
} = require('../services/supportService')

const {
    validateCreateSupport,
    validateSupportListQuery,
    validateSupportId
} = require('../validators/supportValidator')


function handleSupportError(res, error, action) {
    console.log(`Lỗi ${action}:`, error)

    if (error.status) {
        return res.status(error.status).json({message: error.message})
    }

    return res.status(500).json({message: `Không thể ${action}!`})
}


async function createSupport(req, res) {
    const validation = validateCreateSupport(req.body)

    if (!validation.isValid) {
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        const support = await createSupportWorkflow(validation.data, req.files || [], req.user.MATK)

        return res.status(201).json({message: 'Gửi phản hồi hỗ trợ thành công!', support})
    }

    catch (error) {
        return handleSupportError(res, error, 'gửi phản hồi hỗ trợ')
    }
}


async function getMySupports(req, res) {
    const validation = validateSupportListQuery(req.query)

    if (!validation.isValid) {
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        const result = await getMySupportsService(req.user.MATK, validation.data.page, validation.data.limit)

        return res.status(200).json(result)
    }

    catch (error) {
        return handleSupportError(res, error, 'lấy danh sách phản hồi hỗ trợ')
    }
}


async function getMySupportDetail(req, res) {
    const validation = validateSupportId(req.params.maPhanHoi)

    if (!validation.isValid) {
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        const support = await getMySupportDetailService(validation.data.maPhanHoi, req.user.MATK)

        return res.status(200).json({support})
    }

    catch (error) {
        return handleSupportError(res, error, 'lấy chi tiết phản hồi hỗ trợ')
    }
}


async function cancelSupport(req, res) {
    const validation = validateSupportId(req.params.maPhanHoi)

    if (!validation.isValid) {
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        const support =
            await cancelSupportWorkflow(validation.data.maPhanHoi, req.user.MATK)

        return res.status(200).json({message: 'Hủy phản hồi hỗ trợ thành công!', support})
    }

    catch (error) {
        return handleSupportError(res, error, 'hủy phản hồi hỗ trợ')
    }
}


module.exports = {
    createSupport, 
    getMySupports,
    getMySupportDetail,
    cancelSupport
}