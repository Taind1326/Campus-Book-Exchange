const {sql} = require('../config/db')

const {getIO} = require('../config/socket')

const {
    getConversationById,
    validateParticipant,
    validateConversation,
    getReceiverId,
    insertMessage,
    updateConversationActivity,
    getMessagesByConversation,
    markConversationMessagesAsRead: markConversationMessagesAsReadService
} = require('./messageService')


async function sendTextMessage(data, nguoiGui) {
    const transaction = new sql.Transaction()
    let transactionStarted = false

    try {
        await transaction.begin()
        transactionStarted = true

        const conversation = await getConversationById(transaction, data.maCuoc)

        validateParticipant(conversation, nguoiGui)
        validateConversation(conversation)

        const nguoiNhan = getReceiverId(conversation, nguoiGui)

        const message = await insertMessage(transaction, data.maCuoc, nguoiGui, nguoiNhan, data.noiDung, 'Văn bản')

        await updateConversationActivity(transaction, data.maCuoc)

        await transaction.commit()
        transactionStarted = false

        try {
            const io = getIO()

            io.to(`user:${nguoiGui}`).emit('message:sent', message)
            io.to(`user:${nguoiNhan}`).emit('message:new', message)
        }

        catch(socketError){
            console.log('Lỗi emit tin nhắn realtime: ', socketError)
        }
        
        return message
    }

    catch(error){
        if (transactionStarted){
            try {
                await transaction.rollback()
            }

            catch(rollbackError){
                console.log('Lỗi rollback gửi tin nhắn: ', rollbackError)
            }
        }

        throw error

    }
}


async function getConversationMessages(maCuoc, userId) {
    const transaction = new sql.Transaction()
    let transactionStarted = false

    try {
        await transaction.begin()
        transactionStarted = true

        const conversation = await getConversationById(transaction, maCuoc)

        validateParticipant(conversation, userId)

        const messages = await getMessagesByConversation(transaction, maCuoc)

        await transaction.commit()
        transactionStarted = false

        return messages
    }

    catch(error){
        if (transactionStarted){
            try {
                await transaction.rollback()
            }

            catch(rollbackError){
                console.log('Lỗi rollback lấy lịch sử tin nhắn: ', rollbackError)
            }
        }

        throw error

    }
}


async function markConversationMessagesAsRead(maCuoc, userId) {
    const transaction = new sql.Transaction()
    let transactionStarted = false

    try{
        await transaction.begin()
        transactionStarted = true

        const conversation = await getConversationById(transaction, maCuoc)

        validateParticipant(conversation, userId)

        await markConversationMessagesAsReadService(transaction, maCuoc, userId)

        await transaction.commit()
        transactionStarted = false
    }

    catch(error){
        if(transactionStarted){
            try{
                await transaction.rollback()
            }

            catch(rollbackError){
                console.log('Lỗi rollback đọc tin nhắn:', rollbackError)
            }
        }

        throw error
    }
}



module.exports = {sendTextMessage, getConversationMessages, markConversationMessagesAsRead}