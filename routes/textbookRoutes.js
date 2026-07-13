const express = require('express')
const {getAllTextbooks, createTextbook} = require('../controllers/textbookController')
const {authenticateToken} = require('../middlewares/authMiddleware')
const {uploadTextbookImages} = require('../middlewares/uploadMiddleware')

const router = express.Router()

router.get('/', getAllTextbooks)
router.post('/', authenticateToken, uploadTextbookImages.array('HINHANH', 5), createTextbook)


module.exports = router