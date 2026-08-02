const { createReview: createReviewService} = require('../services/reviewWorkflowService')
const {getReviewsBySeller, getSellerReviewStatistics} = require('../services/reviewService')

const {
    validateCreateReview,
    validateSellerId,
    validateReviewListQuery
} = require('../validators/reviewValidator')


async function createReview(req, res) {
    const validation = validateCreateReview(req.body)

    if (!validation.isValid) {
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        const review = await createReviewService(validation.data, req.user.MATK)

        return res.status(201).json({message: 'Đánh giá người bán thành công!', review})
    }

    catch (error) {
        console.log('Lỗi tạo đánh giá: ', error)

        return res.status(error.status || error.statusCode || 500).json({message: error.status || error.statusCode ? error.message : 'Không thể tạo đánh giá!'})
    }
}


async function getSellerReviews(req, res) {
    const sellerValidation = validateSellerId(req.params.maTK)

    if (!sellerValidation.isValid) {
        return res.status(sellerValidation.status).json({message: sellerValidation.message})
    }

    const queryValidation = validateReviewListQuery(req.query)

    if (!queryValidation.isValid) {
        return res.status(queryValidation.status).json({message: queryValidation.message})
    }

    try {
        const result = await getReviewsBySeller(sellerValidation.data, queryValidation.data.page, queryValidation.data.limit)

        return res.status(200).json(result)
    }

    catch (error) {
        console.log('Lỗi lấy đánh giá người bán: ', error)

        return res.status(error.status || error.statusCode || 500).json({
                message: error.status || error.statusCode ? error.message : 'Không thể lấy danh sách đánh giá!'})
    }
}


async function getSellerStatistics(req, res) {
    const validation = validateSellerId(req.params.maTK)

    if (!validation.isValid) {
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        const statistics = await getSellerReviewStatistics(validation.data)

        if (!statistics) {
            return res.status(404).json({message: 'Không tìm thấy tài khoản người bán'})
        }

        return res.status(200).json({statistics})
    }

    catch (error) {
        console.log('Lỗi lấy thống kê đánh giá: ', error)

        return res.status(error.status || error.statusCode || 500).json({message: error.status || error.statusCode ? error.message : 'Không thể lấy thống kê đánh giá!'})
    }
}


module.exports = {createReview, getSellerReviews, getSellerStatistics}