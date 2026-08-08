const {
    getNotifications:
        getNotificationsService,

    getUnreadNotificationCount:
        getUnreadNotificationCountService,

    markAllNotificationsAsRead:
        markAllNotificationsAsReadService,

    markNotificationAsRead:
        markNotificationAsReadService
} = require(
    '../services/notificationService'
)

const {
    deactivatePushDevice:
        deactivatePushDeviceService,

    registerPushDevice:
        registerPushDeviceService
} = require(
    '../services/pushDeviceService'
)

const {
    validateNotificationId,
    validatePushDevice,
    validatePushToken
} = require(
    '../validators/notificationValidator'
)


async function getNotifications(
    req,
    res
) {
    try {
        const notifications =
            await getNotificationsService(
                req.user.MATK
            )


        return res.status(200).json(
            notifications
        )
    }

    catch (error) {
        console.error(
            'Lỗi lấy danh sách thông báo:',
            error
        )


        return res.status(500).json({
            message:
                'Không thể lấy danh sách thông báo!'
        })
    }
}


async function getUnreadNotificationCount(
    req,
    res
) {
    try {
        const count =
            await getUnreadNotificationCountService(
                req.user.MATK
            )


        return res.status(200).json({
            unreadCount: count
        })
    }

    catch (error) {
        console.error(
            'Lỗi đếm thông báo chưa đọc:',
            error
        )


        return res.status(500).json({
            message:
                'Không thể đếm thông báo chưa đọc!'
        })
    }
}


async function markNotificationAsRead(
    req,
    res
) {
    const validation =
        validateNotificationId(
            req.params.id
        )


    if (!validation.isValid) {
        return res
            .status(validation.status)
            .json({
                message:
                    validation.message
            })
    }


    try {
        await markNotificationAsReadService(
            validation.data,
            req.user.MATK
        )


        return res.status(200).json({
            message:
                'Đã đánh dấu thông báo là đã đọc!'
        })
    }

    catch (error) {
        console.error(
            'Lỗi đánh dấu thông báo đã đọc:',
            error
        )


        return res
            .status(error.status || 500)
            .json({
                message:
                    error.status
                        ? error.message
                        : (
                            'Không thể đánh dấu ' +
                            'thông báo đã đọc!'
                        )
            })
    }
}


async function markAllNotificationsAsRead(
    req,
    res
) {
    try {
        await markAllNotificationsAsReadService(
            req.user.MATK
        )


        return res.status(200).json({
            message:
                'Đã đánh dấu tất cả thông báo là đã đọc!'
        })
    }

    catch (error) {
        console.error(
            'Lỗi đánh dấu tất cả thông báo đã đọc:',
            error
        )


        return res.status(500).json({
            message:
                'Không thể đánh dấu tất cả thông báo!'
        })
    }
}


async function registerPushDevice(
    req,
    res
) {
    const validation =
        validatePushDevice(req.body)


    if (!validation.isValid) {
        return res
            .status(validation.status)
            .json({
                message:
                    validation.message
            })
    }


    try {
        const device =
            await registerPushDeviceService(
                req.user.MATK,
                validation.data
            )


        return res.status(200).json({
            message:
                'Đã bật thông báo trên thiết bị này!',
            device
        })
    }

    catch (error) {
        console.error(
            'Lỗi đăng ký thiết bị nhận thông báo:',
            error
        )


        return res.status(500).json({
            message:
                'Không thể bật thông báo trên thiết bị này!'
        })
    }
}


async function deactivatePushDevice(
    req,
    res
) {
    const validation =
        validatePushToken(req.body)


    if (!validation.isValid) {
        return res
            .status(validation.status)
            .json({
                message:
                    validation.message
            })
    }


    try {
        await deactivatePushDeviceService(
            req.user.MATK,
            validation.data.token
        )


        return res.status(200).json({
            message:
                'Đã tắt thông báo trên thiết bị này!'
        })
    }

    catch (error) {
        console.error(
            'Lỗi tắt thông báo trên thiết bị:',
            error
        )


        return res.status(500).json({
            message:
                'Không thể tắt thông báo trên thiết bị này!'
        })
    }
}


module.exports = {
    deactivatePushDevice,
    getNotifications,
    getUnreadNotificationCount,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    registerPushDevice
}