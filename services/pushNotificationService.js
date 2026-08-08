const {
    getFirebaseMessaging
} = require(
    '../config/firebaseAdmin'
)

const {
    deactivateInvalidPushTokens,
    getActivePushTokens
} = require(
    './pushDeviceService'
)


const MAX_TOKENS_PER_REQUEST = 500

const INVALID_TOKEN_CODES = new Set([
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered'
])


function getClientOrigin() {
    const configuredOrigins =
        String(
            process.env.CLIENT_ORIGINS || ''
        )
            .split(',')
            .map(origin => origin.trim())
            .filter(Boolean)


    if (configuredOrigins.length > 0) {
        return configuredOrigins[0]
    }


    if (
        process.env.NODE_ENV !==
        'production'
    ) {
        return 'http://localhost:5173'
    }


    return null
}


function getNotificationPath(
    notification
) {
    const path =
        notification.DUONGDAN ||
        notification.duongDan


    if (
        typeof path === 'string' &&
        path.startsWith('/') &&
        !path.startsWith('//')
    ) {
        return path
    }


    return '/notifications'
}


function getNotificationLink(
    notification
) {
    const clientOrigin =
        getClientOrigin()


    if (!clientOrigin) {
        return null
    }


    try {
        return new URL(
            getNotificationPath(notification),
            clientOrigin
        ).toString()
    }

    catch {
        return null
    }
}


function createDataPayload(
    notification
) {
    const values = {
        notificationId:
            notification.MATB ??
            notification.notificationId,

        type:
            notification.LOAI ??
            notification.loai,

        path:
            getNotificationPath(
                notification
            ),

        orderId:
            notification.MADH ??
            notification.maDH,

        textbookId:
            notification.MAGT ??
            notification.maGT,

        conversationId:
            notification.MACUOC ??
            notification.maCuoc,

        messageId:
            notification.MATN ??
            notification.maTN,

        reviewId:
            notification.MADG ??
            notification.maDG
    }


    return Object.fromEntries(
        Object.entries(values)
            .filter(([, value]) =>
                value !== undefined &&
                value !== null &&
                value !== ''
            )
            .map(([key, value]) => [
                key,
                String(value)
            ])
    )
}


function createPushMessage(
    tokens,
    notification
) {
    const title =
        notification.TIEUDE ||
        notification.tieuDe ||
        'Campus Book Exchange'

    const body =
        notification.NOIDUNG ||
        notification.noiDung ||
        'Bạn có thông báo mới.'

    const link =
        getNotificationLink(
            notification
        )


    const message = {
        tokens,

        notification: {
            title,
            body
        },

        data: createDataPayload(
            notification
        ),

        webpush: {
            notification: {
                tag:
                    notification.MATB
                        ? (
                            'notification-' +
                            notification.MATB
                        )
                        : undefined,

                renotify: false
            }
        }
    }


    if (link) {
        message.webpush.fcmOptions = {
            link
        }
    }


    return message
}


function splitIntoBatches(
    values,
    batchSize
) {
    const batches = []


    for (
        let index = 0;
        index < values.length;
        index += batchSize
    ) {
        batches.push(
            values.slice(
                index,
                index + batchSize
            )
        )
    }


    return batches
}


async function sendPushNotification(
    accountId,
    notification
) {
    const messaging =
        getFirebaseMessaging()


    if (!messaging) {
        return {
            sentCount: 0,
            failedCount: 0
        }
    }


    const tokens =
        await getActivePushTokens(
            accountId
        )


    if (tokens.length === 0) {
        return {
            sentCount: 0,
            failedCount: 0
        }
    }


    const batches =
        splitIntoBatches(
            tokens,
            MAX_TOKENS_PER_REQUEST
        )

    const invalidTokens = []

    let sentCount = 0
    let failedCount = 0


    for (const batch of batches) {
        const result =
            await messaging
                .sendEachForMulticast(
                    createPushMessage(
                        batch,
                        notification
                    )
                )


        sentCount +=
            result.successCount

        failedCount +=
            result.failureCount


        result.responses.forEach(
            (response, index) => {
                const errorCode =
                    response.error?.code


                if (
                    !response.success &&
                    INVALID_TOKEN_CODES.has(
                        errorCode
                    )
                ) {
                    invalidTokens.push(
                        batch[index]
                    )
                }
            }
        )
    }


    await deactivateInvalidPushTokens(
        [...new Set(invalidTokens)]
    )


    return {
        sentCount,
        failedCount
    }
}


module.exports = {
    sendPushNotification
}