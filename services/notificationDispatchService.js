const {
    getIO
} = require('../config/socket')

const {
    sendPushNotification
} = require(
    './pushNotificationService'
)


function getRecipientId(
    notification
) {
    return Number(
        notification?.NGUOINHAN ??
        notification?.nguoiNhan
    )
}


function sendRealtimeNotification(
    notification
) {
    const recipientId =
        getRecipientId(notification)


    if (
        !Number.isInteger(recipientId) ||
        recipientId <= 0
    ) {
        return
    }


    try {
        const io = getIO()

        io.to(
            `user:${recipientId}`
        ).emit(
            'notification:new',
            notification
        )
    }

    catch (error) {
        console.error(
            'Lỗi gửi thông báo realtime:',
            error
        )
    }
}


async function dispatchNotification(
    notification
) {
    const recipientId =
        getRecipientId(notification)


    if (
        !Number.isInteger(recipientId) ||
        recipientId <= 0
    ) {
        return {
            sentCount: 0,
            failedCount: 0
        }
    }


    sendRealtimeNotification(
        notification
    )


    try {
        return await sendPushNotification(
            recipientId,
            notification
        )
    }

    catch (error) {
        console.error(
            'Lỗi gửi push notification:',
            error
        )


        return {
            sentCount: 0,
            failedCount: 0
        }
    }
}


async function dispatchNotifications(
    notifications
) {
    if (!Array.isArray(notifications)) {
        return []
    }


    return Promise.all(
        notifications.map(
            notification =>
                dispatchNotification(
                    notification
                )
        )
    )
}


module.exports = {
    dispatchNotification,
    dispatchNotifications
}