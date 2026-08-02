const multer = require('multer')

const storage = multer.memoryStorage()

const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp'
]


function createUploadError(message) {
    const error = new Error(message)
    error.status = 400
    return error
}


function imgFilter(req, file, callback) {
    if (!allowedMimeTypes.includes(file.mimetype)) {
        return callback(createUploadError('Chỉ chấp nhận ảnh JPG, JPEG, PNG hoặc WEBP!')
        )
    }

    return callback(null, true)
}


function detectImageMime(buffer) {
    if (!Buffer.isBuffer(buffer)) {
        return null
    }

    if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        return 'image/jpeg'
    }


    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(
            Buffer.from([
                0x89, 0x50, 0x4E, 0x47,
                0x0D, 0x0A, 0x1A, 0x0A
            ])
        )
    ) {
        return 'image/png'
    }


    if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
        return 'image/webp'
    }

    return null
}


function getUploadedFiles(req) {
    if (Array.isArray(req.files)) {
        return req.files
    }

    if (req.files && typeof req.files === 'object') {
        return Object.values(req.files).flat()
    }

    if (req.file) {
        return [req.file]
    }

    return []
}


function validateUploadedImages(req, res, next) {
    const files = getUploadedFiles(req)

    for (const file of files) {
        const detectedMime = detectImageMime(file.buffer)

        if (!detectedMime || detectedMime !== file.mimetype) {
            return res.status(400).json({
                message: 'Tệp tải lên không phải ảnh JPG, PNG hoặc WEBP hợp lệ!'})
        }
    }

    return next()
}


const imageUploadOptions = {
    storage,
    fileFilter: imgFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 5
    }
}


const uploadTextbookImages = multer(imageUploadOptions)
const uploadSupportImages = multer(imageUploadOptions)


module.exports = {
    uploadTextbookImages,
    uploadSupportImages,
    validateUploadedImages
}