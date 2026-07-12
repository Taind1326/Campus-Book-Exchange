const express = require('express')
const {getAllTextbooks} = require('../controllers/textbookController')

const router = express.Router()

router.get('/', getAllTextbooks)

module.exports = router