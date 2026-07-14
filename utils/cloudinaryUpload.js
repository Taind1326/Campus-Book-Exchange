const cloudinary = require('../config/cloudinary')
const streamifier = require('streamifier')

function uploadSingleImage(file){
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream({
            folder: 'Campus-Book-Exchange/giaotrinh',
            resource_type: 'image'
        },

        (error, result) => {
            if (error){
                return reject(error)
            }

            resolve({
                DUONGDAN: result.secure_url,
                PUBLIC_ID: result.public_id
            })
        }
    )

    streamifier.createReadStream(file.buffer).pipe(uploadStream)   

    })
}


async function  uploadImages(files) {
    if (!files || files.length === 0){
        return []
    }

    const uploadPromises = files.map((file, index) =>{
        return uploadSingleImage(file).then((image) =>{
            return {...image, THUTU: index + 1}
        })
    })
    return Promise.all(uploadPromises)
}


async function deleteImages(publicIds) {
    if (!publicIds || publicIds.length === 0){
        return
    }

    const deletePromises = publicIds.map((publicId) =>{
        return cloudinary.uploader.destroy(publicId)
    })

    await Promise.all(deletePromises)
}


module.exports = {uploadImages, deleteImages}