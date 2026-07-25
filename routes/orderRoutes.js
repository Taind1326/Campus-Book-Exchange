const express = require('express')

const {
    createOrder,
    confirmOrder,
    getBuyingOrders,
    getSellingOrders,
    getOrderDetail
} = require('../controllers/orderController')

const {
    authenticateToken
} = require('../middlewares/authMiddleware')

const router = express.Router()

router.get('/buying', authenticateToken, getBuyingOrders)
router.get('/selling', authenticateToken, getSellingOrders)
router.get('/:maDH', authenticateToken, getOrderDetail)

router.post('/', authenticateToken, createOrder)

router.patch('/:maDH/confirm', authenticateToken, confirmOrder)


module.exports = router