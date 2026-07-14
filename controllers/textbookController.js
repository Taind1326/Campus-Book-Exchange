const { getPublicTextbooks, 
        getTextbookById: getTextbookByIdService, 
        getMyTextbooks: getMyTextbooksService, 
        createTextbook: createTextbookService,
        updateTextbook: updateTextbookService} = require('../services/textbookService')

const {validateCreateTextbook, validateUpdateTextbook} = require('../validators/textbookValidator')


async function getAllTextbooks(req, res) {
    try{
        const textbooks = await getPublicTextbooks()
        return res.status(200).json(textbooks)
    }

    catch(error){
        console.log('Lỗi lấy danh sách giáo trình!', error)
        return res.status(500).json({message:'Không thể lấy danh sách giáo trình!'})
    }
}


async function getTextbookById(req, res) {
    const maGT = Number(req.params.id)

    if (!Number.isInteger(maGT) || maGT <= 0){
        return res.status(400).json({message: 'Mã giáo trình không hợp lệ!'})
    }

    try {
        const textbook = await getTextbookByIdService(maGT)

        if (!textbook){
            return res.status(404).json({message: 'Không tìm thấy giáo trình!'})
        }

        return res.status(200).json(textbook)
    }

    catch(error){
        console.log('Lỗi lấy chi tiết giáo trình: ',error)
        return res.status(500).json({message: 'Không thể lấy thông tin giáo trình!'})
    }
}


async function getMyTextbooks(req, res) {
    try {
        const textbooks = await getMyTextbooksService(req.user.MATK)
        return res.status(200).json(textbooks)
    }

    catch(error){
        console.log('Lỗi lấy giáo trình của tôi: ', error)
        return res.status(500).json({message: 'Không thể lấy danh sách giáo trình của bạn!'})
    }
}


async function createTextbook(req, res) {
    if (req.user.TRANGTHAI === 'Bị hạn chế'){
        return res.status(403).json({message: 'Tài khoản bị hạn chế, không thể đăng giáo trình!'})
    }

    const validation = validateCreateTextbook(req.body, req.files)

    if (!validation.isValid){
        return res.status(validation.status).json({message: validation.message})
    }

    try{
        const result = await createTextbookService(validation.data, req.files, req.user.MATK)
        return res.status(201).json({message: 'Đăng tải giáo trình thành công!', textbook: {
            MAGT: result.maGT,
            TENGT: validation.data.tenGT,
            HINHANH: result.uploadedImages
        }
    })
    }
        
    catch(error){
        console.log('Lỗi đăng giáo trình: ', error)

        return res.status(error.status || 500).json({message: error.status ? error.message : 'Không thể đăng tải giáo trình!'})
    }
}


async function updateTextbook(req, res) {
    const maGT = Number(req.params.id)

    if (!Number.isInteger(maGT) || maGT <= 0){
        return res.status(400).json({message: 'Mã giáo trình không hợp lệ!'})
    }

    const validation = validateUpdateTextbook(req.body)

    if (!validation.isValid){
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        await updateTextbookService(maGT, validation.data, req.user.MATK)

        return res.status(200).json({message: 'Cập nhật giáo trình thành công!'})
    }

    catch(error){
        console.log('Lỗi cập nhật giáo trình: ',error)

        return res.status(error.status || 500).json({message: error.status ? error.message : 'Không thể cập nhật giáo trình!'})
    }
}

module.exports = {getAllTextbooks, getTextbookById, getMyTextbooks, createTextbook, updateTextbook}