const express = require('express')

const {
    createSupport,
    getMySupports,
    getMySupportDetail,
    cancelSupport
} = require('../controllers/supportController')

const {
    authenticateToken
} = require('../middlewares/authMiddleware')

const {
    uploadSupportImages
} = require('../middlewares/uploadMiddleware')


const router = express.Router()


router.get('/my', authenticateToken, getMySupports)
router.get('/:maPhanHoi', authenticateToken, getMySupportDetail)

router.post('/', authenticateToken, uploadSupportImages.array('images', 5), createSupport)

router.patch('/:maPhanHoi/cancel', authenticateToken, cancelSupport)

module.exports = router