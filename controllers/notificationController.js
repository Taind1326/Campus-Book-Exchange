const {
    getNotifications: getNotificationsService,
    markNotificationAsRead: markNotificationAsReadService
} = require('../services/notificationService')

const {validateNotificationId} = require('../validators/notificationValidator')

async function getNotifications(req, res) {
    try {
        const notifications = await getNotificationsService(req.user.MATK)

        return res.json(notifications)
    }

    catch(error){
        console.log('Lỗi lấy danh sách thông báo: ',error)

        return res.status(500).json({message: 'Không thể lấy danh sách thông báo!'})
    }
}


async function markNotificationAsRead(req, res) {
    const validation = validateNotificationId(req.params.id)

    if(!validation.isValid){
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        await markNotificationAsReadService(validation.data, req.user.MATK)
        return res.status(200).json({message: 'Đã đánh dấu thông báo là đã đọc!'})
    }

    catch(error){
        console.log('Lỗi đánh dấu thông báo đã đọc: ',error)
        return res.status(error.status || 500).json({message: error.status ? error.message : 'Không thể đánh dấu thông báo đã đọc!'})
    }
}



module.exports = {getNotifications, markNotificationAsRead}