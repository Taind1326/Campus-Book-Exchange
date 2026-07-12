const express = require('express')
const {getAllTextbooks, createTextbook} = require('../controllers/textbookController')

const router = express.Router()

router.get('/', getAllTextbooks)
router.post('/', createTextbook)

module.exports = router