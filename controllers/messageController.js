const {
    sendTextMessage: sendTextMessageService,
    getConversationMessages: getConversationMessagesService
} = require('../services/messageWorkflowService')

const {
    validateCreateMessage,
    validateConversationId
} = require('../validators/messageValidator')

async function sendTextMessage(req, res) {
    const validation = validateCreateMessage(req.body)

    if (!validation.isValid){
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        const message = await sendTextMessageService(validation.data, req.user.MATK)

        return res.status(201).json({message: 'Gửi tin nhắn thành công!', data: message})
    }

    catch(error){
        console.log('Lỗi gửi tin nhắn: ',error)
        return res.status(error.status || 500).json({message: error.status ? error.message : 'Không thể gửi tin nhắn!'})
    }
}


async function getConversationMessages(req, res) {
    const validation = validateConversationId(req.params.maCuoc)

    if (!validation.isValid){
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        const messages = await getConversationMessagesService(validation.data, req.user.MATK)

        return res.status(200).json(messages)
    }

    catch(error){
        console.log('Lỗi lấy lịch sử tin nhắn: ', error)
        return res.status(error.status || 500).json({message: error.status ? error.message : 'Không thể lấy lịch sử tin nhắn!'})
    }


}



module.exports = {sendTextMessage, getConversationMessages}