const express = require('express')

const {
    createOrder,
    confirmOrder,
    getBuyingOrders,
    getSellingOrders
} = require('../controllers/orderController')

const {
    authenticateToken
} = require('../middlewares/authMiddleware')

const router = express.Router()

router.get('/buying', authenticateToken, getBuyingOrders)
router.get('/selling', authenticateToken, getSellingOrders)

router.post('/', authenticateToken, createOrder)

router.patch('/:maDH/confirm', authenticateToken, confirmOrder)


module.exports = router