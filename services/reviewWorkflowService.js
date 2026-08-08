const {sql} = require('../config/db')

const {
    dispatchNotification
} = require(
    './notificationDispatchService'
)

const {
    checkExistingReview,
    getOrderForReview,
    insertReview,
    validateReviewOrder
} = require('./reviewService')

const {
    createReviewNotification
} = require('./notificationService')


async function createReview(
    data,
    reviewerId
) {
    const transaction =
        new sql.Transaction()

    let transactionStarted = false


    try {
        await transaction.begin()
        transactionStarted = true


        const order =
            await getOrderForReview(
                transaction,
                data.maDH
            )


        validateReviewOrder(
            order,
            reviewerId
        )


        await checkExistingReview(
            transaction,
            data.maDH,
            reviewerId
        )


        const review =
            await insertReview(
                transaction,
                data,
                reviewerId,
                order.NGUOIBAN
            )


        const notification =
            await createReviewNotification(
                transaction,
                review,
                order
            )


        await transaction.commit()
        transactionStarted = false


        await dispatchNotification(
            notification
        )


        return review
    }

    catch (error) {
        if (transactionStarted) {
            try {
                await transaction.rollback()
            }

            catch (rollbackError) {
                console.error(
                    'Lỗi rollback tạo đánh giá:',
                    rollbackError
                )
            }
        }


        throw error
    }
}


module.exports = {
    createReview
}