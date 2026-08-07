const express = require('express')

const {
    createOrder,
    confirmOrder,
    getBuyingOrders,
    getSellingOrders,
    getOrderDetail,
    rejectOrder,
    cancelOrder,
    markOrderDelivered,
    confirmOrderReceived,
    reportOrderIssue,
    getPendingSellingOrderCount
} = require('../controllers/orderController')

const {
    authenticateToken
} = require('../middlewares/authMiddleware')

const router = express.Router()

router.get('/buying', authenticateToken, getBuyingOrders)
router.get('/selling', authenticateToken, getSellingOrders)
router.get('/selling/pending-count', authenticateToken, getPendingSellingOrderCount)
router.get('/:maDH', authenticateToken, getOrderDetail)


router.post('/', authenticateToken, createOrder)

router.patch('/:maDH/confirm', authenticateToken, confirmOrder)
router.patch('/:maDH/reject', authenticateToken, rejectOrder)
router.patch('/:maDH/cancel', authenticateToken, cancelOrder)
router.patch('/:maDH/delivered', authenticateToken, markOrderDelivered)
router.patch('/:maDH/received', authenticateToken, confirmOrderReceived)
router.patch('/:maDH/report-issue', authenticateToken, reportOrderIssue)


module.exports = router