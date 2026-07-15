const express = require('express')
const {createOrder} = require('../controllers/orderController')
const {authenticateToken} = require('../middlewares/authMiddleware')

const router = express.Router()

router.post('/', authenticateToken, createOrder)

module.exports = router