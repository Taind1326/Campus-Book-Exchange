const express = require('express')
const {getAllTextbooks, getTextbookById, createTextbook} = require('../controllers/textbookController')
const {authenticateToken} = require('../middlewares/authMiddleware')
const {uploadTextbookImages} = require('../middlewares/uploadMiddleware')

const router = express.Router()

router.get('/', getAllTextbooks)
router.get('/:id', getTextbookById)
router.post('/', authenticateToken, uploadTextbookImages.array('HINHANH', 5), createTextbook)


module.exports = router