const multer = require('multer')
const storage = multer.memoryStorage()

function imgFilter(req, file, callback){
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']

    if (!allowedMimeTypes.includes(file.mimetype)){
        return callback (new Error('Chỉ chấp nhận ảnh JPG, JPEG, PNG hoặc WEBP'))
    }

    callback(null, true)
}


const uploadTextbookImages = multer({storage, fileFilter: imgFilter, limits: {fileSize: 5*1024*1024, files: 5}})

module.exports = {uploadTextbookImages}