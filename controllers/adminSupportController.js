const {
    getAdminSupports: getAdminSupportsService,
    getAdminSupportDetail: getAdminSupportDetailService
} = require('../services/adminSupportService')

const {
    validateAdminSupportListQuery,
    validateSupportId
} = require('../validators/adminSupportValidator')


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


module.exports = {
    getAdminSupports,
    getAdminSupportDetail
}