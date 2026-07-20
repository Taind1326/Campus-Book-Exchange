const express = require('express')
const router = express.Router()

const {authenticateToken} = require('../middlewares/authMiddleware')
const {createReport} = require('../controllers/reportController')


router.post('/', authenticateToken, createReport)


module.exports = router