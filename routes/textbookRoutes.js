const express = require('express')
const {getAllTextbooks, 
       getTextbookById, 
       getMyTextbooks, 
       createTextbook,
       updateTextbook} = require('../controllers/textbookController')

const {authenticateToken} = require('../middlewares/authMiddleware')
const {uploadTextbookImages} = require('../middlewares/uploadMiddleware')

const router = express.Router()

router.get('/', getAllTextbooks)
router.get('/my', authenticateToken, getMyTextbooks)
router.get('/:id', getTextbookById)

router.post('/', authenticateToken, uploadTextbookImages.array('HINHANH', 5), createTextbook)

router.put('/:id', authenticateToken, uploadTextbookImages.array('HINHANH', 5), updateTextbook)


module.exports = router