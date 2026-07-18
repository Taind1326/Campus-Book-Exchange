const express = require('express')

const {
    createReview,
    getSellerReviews,
    getSellerStatistics
} = require('../controllers/reviewController')

const {authenticateToken} = require('../middlewares/authMiddleware')

const router = express.Router()

router.post('/', authenticateToken, createReview)

router.get('/user/:maTK/statistics', getSellerStatistics)

router.get('/user/:maTK', getSellerReviews)

module.exports = router