const {getNotifications: getNotificationsService} = require('../services/notificationService')

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


module.exports = {getNotifications}