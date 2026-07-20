const {sql} = require('../config/db')
const {getIO} = require('../config/socket')

const {
    getOrderForReview,
    validateReviewOrder,
    checkExistingReview,
    insertReview
} = require('./reviewService')

const {createReviewNotification} = require('./notificationService')


async function createReview(data, nguoiDanhGia) {
    const transaction = new sql.Transaction()
    let transactionStarted = false

    try {
        await transaction.begin()
        transactionStarted = true

        const order = await getOrderForReview(transaction, data.maDH)

        validateReviewOrder(order, nguoiDanhGia)

        await checkExistingReview(transaction, data.maDH, nguoiDanhGia)

        const review = await insertReview(transaction, data, nguoiDanhGia, order.NGUOIBAN)

        const notification = await createReviewNotification(transaction, review, order)

        await transaction.commit()
        transactionStarted = false

        try {
            const io = getIO()

            io.to(`user:${notification.NGUOINHAN}`).emit('notification:new', notification)
        }

        catch (socketError) {
            console.error('Lỗi gửi thông báo realtime đánh giá:', socketError)
        }

        return review
    }

    catch (error) {
        if (transactionStarted) {
            try {
                await transaction.rollback()
            }

            catch (rollbackError) {
                console.error('Lỗi rollback tạo đánh giá:', rollbackError)
            }
        }

        throw error
    }
}


module.exports = {createReview}