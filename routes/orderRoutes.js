const express = require('express')

const {
    createOrder,
    confirmOrder,
    getBuyingOrders,
    getSellingOrders,
    getOrderDetail,
    rejectOrder,
    cancelOrder,
    markOrderDelivered
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
router.patch('/:maDH/reject', authenticateToken, rejectOrder)
router.patch('/:maDH/cancel', authenticateToken, cancelOrder)
router.patch('/:maDH/delivered', authenticateToken, markOrderDelivered)


module.exports = router