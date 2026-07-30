const {sql} = require('../config/db')

const {
    uploadImages,
    deleteImages
} = require('../utils/cloudinaryUpload')

const {
    insertSupport: insertSupportService,
    insertSupportImages: insertSupportImagesService,
    getSupportForCancellationWithLock: getSupportForCancellationWithLockService,
    validateSupportCancellation: validateSupportCancellationService,
    cancelSupport: cancelSupportService
} = require('./supportService')


async function createSupport(data, files, nguoiGui) {
    const transaction = new sql.Transaction()

    let transactionStarted = false
    let uploadedImages = []

    try {
        uploadedImages = await uploadImages(files, 'Campus-Book-Exchange/support')

        await transaction.begin()
        transactionStarted = true

        const support = await insertSupportService(transaction, data, nguoiGui)

        await insertSupportImagesService(transaction, support.MAPHANHOI, uploadedImages)

        await transaction.commit()
        transactionStarted = false

        return {
            ...support,
            HINHANH: uploadedImages
        }
    }

    catch (error) {
        if (transactionStarted) {
            try {
                await transaction.rollback()
            }

            catch (rollbackError) {
                console.error('Lỗi rollback tạo phản hồi hỗ trợ:', rollbackError)
            }
        }

        if (uploadedImages.length > 0) {
            try {
                const publicIds = uploadedImages.map(image => image.PUBLIC_ID)

                await deleteImages(publicIds)
            }

            catch (deleteError) {
                console.error('Lỗi xóa ảnh phản hồi trên Cloudinary:', deleteError)
            }
        }

        throw error
    }
}


async function cancelSupportWorkflow(maPhanHoi, nguoiGui) {
    const transaction = new sql.Transaction()
    let transactionStarted = false

    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE)

        transactionStarted = true

        const support = await getSupportForCancellationWithLockService(transaction, maPhanHoi)

        validateSupportCancellationService(support, nguoiGui)

        const cancelledSupport = await cancelSupportService(transaction, support.MAPHANHOI, nguoiGui)

        await transaction.commit()
        transactionStarted = false

        return cancelledSupport
    }

    catch (error) {
        if (transactionStarted) {
            try {
                await transaction.rollback()
            }

            catch (rollbackError) {
                console.error('Lỗi rollback hủy phản hồi hỗ trợ:', rollbackError)
            }
        }

        throw error
    }
}

module.exports = {
    createSupport,
    cancelSupportWorkflow
}