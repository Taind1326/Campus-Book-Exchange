const cloudinary = require('../config/cloudinary')
const streamifier = require('streamifier')


function uploadSingleImage(file, folder = 'Campus-Book-Exchange/giaotrinh') {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream({folder, resource_type: 'image'},
                (error, result) => {
                    if (error) {
                        return reject(error)
                    }

                    resolve({
                        DUONGDAN: result.secure_url,
                        PUBLIC_ID: result.public_id
                    })
                }
            )

        streamifier
            .createReadStream(file.buffer)
            .pipe(uploadStream)
    })
}


async function uploadImages(
    files,
    folder =
        'Campus-Book-Exchange/giaotrinh'
) {
    if (
        !Array.isArray(files) ||
        files.length === 0
    ) {
        return []
    }

    const uploadedImages = []

    try {
        for (
            let index = 0;
            index < files.length;
            index += 1
        ) {
            const image =
                await uploadSingleImage(
                    files[index],
                    folder
                )

            uploadedImages.push({
                ...image,
                THUTU: index + 1
            })
        }

        return uploadedImages
    }

    catch (error) {
        const uploadedPublicIds =
            uploadedImages.map(
                image => image.PUBLIC_ID
            )

        if (
            uploadedPublicIds.length > 0
        ) {
            try {
                await deleteImages(
                    uploadedPublicIds
                )
            }

            catch (cleanupError) {
                console.error(
                    'Không thể dọn ảnh upload lỗi:',
                    cleanupError
                )
            }
        }

        throw error
    }
}


async function deleteImages(publicIds) {
    if (!publicIds || publicIds.length === 0) {
        return
    }

    const deletePromises = publicIds.map(
        publicId => {
            return cloudinary.uploader.destroy(
                publicId
            )
        }
    )

    await Promise.all(deletePromises)
}


module.exports = {
    uploadImages,
    deleteImages
}