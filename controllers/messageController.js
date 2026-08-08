const {
    getConversationMessages:
        getConversationMessagesService,
    markConversationMessagesAsRead:
        markConversationMessagesAsReadService,
    sendImageMessage:
        sendImageMessageService,
    sendTextMessage:
        sendTextMessageService
} = require(
    '../services/messageWorkflowService'
)

const {
    validateConversationId,
    validateCreateImageMessage,
    validateCreateMessage
} = require(
    '../validators/messageValidator'
)


async function sendTextMessage(
    req,
    res
) {
    const validation =
        validateCreateMessage(
            req.body
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
        const message =
            await sendTextMessageService(
                validation.data,
                req.user.MATK
            )

        return res.status(201).json({
            message:
                'Gửi tin nhắn thành công!',
            data: message
        })
    }

    catch (error) {
        return handleMessageError(
            res,
            error,
            'gửi tin nhắn văn bản',
            'Không thể gửi tin nhắn!'
        )
    }
}


async function sendImageMessage(
    req,
    res
) {
    const validation =
        validateCreateImageMessage(
            req.body,
            req.files
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
        const message =
            await sendImageMessageService(
                validation.data,
                req.files,
                req.user.MATK
            )

        return res.status(201).json({
            message:
                'Gửi hình ảnh thành công!',
            data: message
        })
    }

    catch (error) {
        return handleMessageError(
            res,
            error,
            'gửi tin nhắn hình ảnh',
            'Không thể gửi hình ảnh!'
        )
    }
}


async function getConversationMessages(
    req,
    res
) {
    const validation =
        validateConversationId(
            req.params.maCuoc
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
        const messages =
            await getConversationMessagesService(
                validation.data,
                req.user.MATK
            )

        return res
            .status(200)
            .json(messages)
    }

    catch (error) {
        return handleMessageError(
            res,
            error,
            'lấy lịch sử tin nhắn',
            'Không thể lấy lịch sử tin nhắn!'
        )
    }
}


async function markConversationMessagesAsRead(
    req,
    res
) {
    const validation =
        validateConversationId(
            req.params.maCuoc
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
        await markConversationMessagesAsReadService(
            validation.data,
            req.user.MATK
        )

        return res.status(200).json({
            message:
                'Đã đánh dấu các tin nhắn đã đọc!'
        })
    }

    catch (error) {
        return handleMessageError(
            res,
            error,
            'đánh dấu tin nhắn đã đọc',
            'Không thể đánh dấu tin nhắn!'
        )
    }
}


function handleMessageError(
    res,
    error,
    action,
    fallbackMessage
) {
    console.error(
        `Lỗi ${action}:`,
        error
    )

    if (error.status) {
        return res
            .status(error.status)
            .json({
                message: error.message
            })
    }

    return res
        .status(500)
        .json({
            message: fallbackMessage
        })
}


module.exports = {
    getConversationMessages,
    markConversationMessagesAsRead,
    sendImageMessage,
    sendTextMessage
}