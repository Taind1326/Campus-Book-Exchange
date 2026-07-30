const {
    getAdminTextbooks: getAdminTextbooksService,
    getAdminTextbookDetail:
        getAdminTextbookDetailService
} = require('../services/adminTextbookService')

const {
    validateAdminTextbookListQuery,
    validateTextbookId
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
        const textbook = await getAdminTextbookDetailService(validation.data.maGT)

        return res.status(200).json({textbook})
    }

    catch (error) {
        return handleAdminTextbookError(res, error, 'lấy chi tiết bài đăng')
    }
}


module.exports = {
    getAdminTextbooks,
    getAdminTextbookDetail
}