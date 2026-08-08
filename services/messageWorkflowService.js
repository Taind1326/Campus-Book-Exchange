const {
    sql
} = require('../config/db')

const {
    getIO
} = require('../config/socket')

const {
    deleteImages,
    uploadImages
} = require('../utils/cloudinaryUpload')

const {
    getConversationById,
    getMessagesByConversation,
    getReceiverId,
    insertMessage,
    insertMessageImages,
    markConversationMessagesAsRead:
        markMessagesAsReadQuery,
    updateConversationActivity,
    validateConversation,
    validateParticipant
} = require('./messageService')


async function sendTextMessage(
    data,
    nguoiGui
) {
    const transaction =
        new sql.Transaction()

    let transactionStarted = false


    try {
        await transaction.begin()
        transactionStarted = true

        const conversation =
            await getConversationById(
                transaction,
                data.maCuoc
            )

        validateParticipant(
            conversation,
            nguoiGui
        )

        validateConversation(
            conversation
        )

        const nguoiNhan =
            getReceiverId(
                conversation,
                nguoiGui
            )

        const insertedMessage =
            await insertMessage(
                transaction,
                data.maCuoc,
                nguoiGui,
                nguoiNhan,
                data.noiDung,
                'Văn bản'
            )

        await updateConversationActivity(
            transaction,
            data.maCuoc
        )

        await transaction.commit()
        transactionStarted = false

        const message = {
            ...insertedMessage,
            HINHANH: []
        }

        emitRealtimeMessage(
            message,
            nguoiGui,
            nguoiNhan
        )

        return message
    }

    catch (error) {
        if (transactionStarted) {
            await rollbackTransaction(
                transaction,
                'gửi tin nhắn văn bản'
            )
        }

        throw error
    }
}


async function sendImageMessage(
    data,
    files,
    nguoiGui
) {
    const transaction =
        new sql.Transaction()

    let transactionStarted = false
    let uploadedImages = []


    try {
        await transaction.begin()
        transactionStarted = true

        const conversation =
            await getConversationById(
                transaction,
                data.maCuoc
            )

        validateParticipant(
            conversation,
            nguoiGui
        )

        validateConversation(
            conversation
        )

        const nguoiNhan =
            getReceiverId(
                conversation,
                nguoiGui
            )

        uploadedImages =
            await uploadImages(
                files,
                'Campus-Book-Exchange/tin-nhan'
            )

        const insertedMessage =
            await insertMessage(
                transaction,
                data.maCuoc,
                nguoiGui,
                nguoiNhan,
                data.noiDung,
                'Hình ảnh'
            )

        const insertedImages =
            await insertMessageImages(
                transaction,
                insertedMessage.MATN,
                uploadedImages
            )

        await updateConversationActivity(
            transaction,
            data.maCuoc
        )

        await transaction.commit()
        transactionStarted = false

        const message = {
            ...insertedMessage,
            HINHANH: insertedImages
        }

        emitRealtimeMessage(
            message,
            nguoiGui,
            nguoiNhan
        )

        return message
    }

    catch (error) {
        if (transactionStarted) {
            await rollbackTransaction(
                transaction,
                'gửi tin nhắn hình ảnh'
            )
        }

        await cleanupUploadedImages(
            uploadedImages
        )

        throw error
    }
}


async function getConversationMessages(
    maCuoc,
    userId
) {
    const transaction =
        new sql.Transaction()

    let transactionStarted = false


    try {
        await transaction.begin()
        transactionStarted = true

        const conversation =
            await getConversationById(
                transaction,
                maCuoc
            )

        validateParticipant(
            conversation,
            userId
        )

        const messages =
            await getMessagesByConversation(
                transaction,
                maCuoc
            )

        await transaction.commit()
        transactionStarted = false

        return messages
    }

    catch (error) {
        if (transactionStarted) {
            await rollbackTransaction(
                transaction,
                'lấy lịch sử tin nhắn'
            )
        }

        throw error
    }
}


async function markConversationMessagesAsRead(
    maCuoc,
    userId
) {
    const transaction =
        new sql.Transaction()

    let transactionStarted = false


    try {
        await transaction.begin()
        transactionStarted = true

        const conversation =
            await getConversationById(
                transaction,
                maCuoc
            )

        validateParticipant(
            conversation,
            userId
        )

        await markMessagesAsReadQuery(
            transaction,
            maCuoc,
            userId
        )

        await transaction.commit()
        transactionStarted = false
    }

    catch (error) {
        if (transactionStarted) {
            await rollbackTransaction(
                transaction,
                'đánh dấu tin nhắn đã đọc'
            )
        }

        throw error
    }
}


function emitRealtimeMessage(
    message,
    senderId,
    receiverId
) {
    try {
        const io = getIO()

        io.to(
            `user:${senderId}`
        ).emit(
            'message:sent',
            message
        )

        io.to(
            `user:${receiverId}`
        ).emit(
            'message:new',
            message
        )
    }

    catch (socketError) {
        console.error(
            'Không thể gửi tin nhắn realtime:',
            socketError
        )
    }
}


async function rollbackTransaction(
    transaction,
    action
) {
    try {
        await transaction.rollback()
    }

    catch (rollbackError) {
        console.error(
            `Không thể rollback khi ${action}:`,
            rollbackError
        )
    }
}


async function cleanupUploadedImages(
    uploadedImages
) {
    const publicIds =
        uploadedImages
            .map(image => image.PUBLIC_ID)
            .filter(Boolean)

    if (publicIds.length === 0) {
        return
    }

    try {
        await deleteImages(publicIds)
    }

    catch (cleanupError) {
        console.error(
            'Không thể xóa ảnh tin nhắn sau lỗi:',
            cleanupError
        )
    }
}


module.exports = {
    getConversationMessages,
    markConversationMessagesAsRead,
    sendImageMessage,
    sendTextMessage
}