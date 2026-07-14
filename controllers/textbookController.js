const { getPublicTextbooks, createTextbook: createTextbookService } = require('../services/textbookService')
const {validateCreateTextbook} = require('../validators/textbookValidator')


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

module.exports = {getAllTextbooks, createTextbook}