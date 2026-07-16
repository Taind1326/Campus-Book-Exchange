const {getUserConversations: getUserConversationsService} = require('../services/conversationQueryService')

async function getUserConversations(req, res) {
    try {
        const conversations = await getUserConversationsService(req.user.MATK)

        return res.status(200).json(conversations)
    }

    catch(error){
        console.log('Lỗi lấy danh sách cuộc trò chuyện:', error)

        return res.status(500).json({message: 'Không thể lấy danh sách cuộc trò chuyện!'})
    }
}

module.exports = {getUserConversations}