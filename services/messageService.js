const {
    sql
} = require('../config/db')


async function getConversationById(
    transaction,
    maCuoc
) {
    const request =
        new sql.Request(transaction)

    request.input(
        'MACUOC',
        sql.BigInt,
        maCuoc
    )

    const result = await request.query(`
        SELECT
            MACUOC,
            MAGT,
            MADH,
            NGUOI1,
            NGUOI2,
            TRANGTHAI
        FROM CUOCTROCHUYEN
        WHERE MACUOC = @MACUOC
    `)

    if (result.recordset.length === 0) {
        const error =
            new Error(
                'Không tìm thấy cuộc trò chuyện!'
            )

        error.status = 404
        throw error
    }

    return result.recordset[0]
}


function validateParticipant(
    conversation,
    userId
) {
    if (
        conversation.NGUOI1 !== userId &&
        conversation.NGUOI2 !== userId
    ) {
        const error =
            new Error(
                'Bạn không thuộc cuộc trò chuyện này!'
            )

        error.status = 403
        throw error
    }
}


function validateConversation(
    conversation
) {
    if (
        conversation.TRANGTHAI !==
        'Đang hoạt động'
    ) {
        const error =
            new Error(
                'Cuộc trò chuyện hiện không thể gửi tin nhắn!'
            )

        error.status = 409
        throw error
    }
}


function getReceiverId(
    conversation,
    senderId
) {
    if (
        conversation.NGUOI1 === senderId
    ) {
        return conversation.NGUOI2
    }

    return conversation.NGUOI1
}


async function insertMessage(
    transaction,
    maCuoc,
    nguoiGui,
    nguoiNhan,
    noiDung,
    loaiTinNhan = 'Văn bản'
) {
    const request =
        new sql.Request(transaction)

    request.input(
        'MACUOC',
        sql.BigInt,
        maCuoc
    )

    request.input(
        'NGUOIGUI',
        sql.Int,
        nguoiGui
    )

    request.input(
        'NGUOINHAN',
        sql.Int,
        nguoiNhan
    )

    request.input(
        'NOIDUNG',
        sql.NVarChar(sql.MAX),
        noiDung
    )

    request.input(
        'LOAITINNHAN',
        sql.NVarChar(30),
        loaiTinNhan
    )

    const result = await request.query(`
        INSERT INTO TINNHAN
        (
            MACUOC,
            NGUOIGUI,
            NGUOINHAN,
            NOIDUNG,
            LOAITINNHAN
        )
        OUTPUT
            INSERTED.MATN,
            INSERTED.MACUOC,
            INSERTED.NGUOIGUI,
            INSERTED.NGUOINHAN,
            INSERTED.NOIDUNG,
            INSERTED.LOAITINNHAN,
            INSERTED.THOIGIAN,
            INSERTED.DADOC,
            INSERTED.DAXOA
        VALUES
        (
            @MACUOC,
            @NGUOIGUI,
            @NGUOINHAN,
            @NOIDUNG,
            @LOAITINNHAN
        )
    `)

    return result.recordset[0]
}


async function insertMessageImages(
    transaction,
    messageId,
    images
) {
    const insertedImages = []

    for (const image of images) {
        const request =
            new sql.Request(transaction)

        request.input(
            'MATN',
            sql.BigInt,
            messageId
        )

        request.input(
            'DUONGDAN',
            sql.NVarChar(500),
            image.DUONGDAN
        )

        request.input(
            'PUBLIC_ID',
            sql.NVarChar(300),
            image.PUBLIC_ID
        )

        request.input(
            'THUTU',
            sql.Int,
            image.THUTU
        )

        const result = await request.query(`
            INSERT INTO HINHANHTINNHAN
            (
                MATN,
                DUONGDAN,
                PUBLIC_ID,
                THUTU
            )
            OUTPUT
                INSERTED.MAHINH,
                INSERTED.MATN,
                INSERTED.DUONGDAN,
                INSERTED.THUTU
            VALUES
            (
                @MATN,
                @DUONGDAN,
                @PUBLIC_ID,
                @THUTU
            )
        `)

        insertedImages.push(
            result.recordset[0]
        )
    }

    return insertedImages
}


async function updateConversationActivity(
    transaction,
    maCuoc
) {
    const request =
        new sql.Request(transaction)

    request.input(
        'MACUOC',
        sql.BigInt,
        maCuoc
    )

    await request.query(`
        UPDATE CUOCTROCHUYEN
        SET HOATDONGCUOI = SYSDATETIME()
        WHERE MACUOC = @MACUOC
    `)
}


async function getMessagesByConversation(
    transaction,
    maCuoc
) {
    const messageRequest =
        new sql.Request(transaction)

    messageRequest.input(
        'MACUOC',
        sql.BigInt,
        maCuoc
    )

    const messageResult =
        await messageRequest.query(`
            SELECT
                MATN,
                MACUOC,
                NGUOIGUI,
                NGUOINHAN,
                NOIDUNG,
                LOAITINNHAN,
                THOIGIAN,
                DADOC,
                THOIGIANDOC,
                DAXOA
            FROM TINNHAN
            WHERE MACUOC = @MACUOC
                AND DAXOA = 0
            ORDER BY THOIGIAN ASC
        `)

    if (messageResult.recordset.length === 0) {
        return []
    }

    const imageRequest =
        new sql.Request(transaction)

    imageRequest.input(
        'MACUOC',
        sql.BigInt,
        maCuoc
    )

    const imageResult =
        await imageRequest.query(`
            SELECT
                HA.MAHINH,
                HA.MATN,
                HA.DUONGDAN,
                HA.THUTU
            FROM HINHANHTINNHAN AS HA
            INNER JOIN TINNHAN AS TN
                ON TN.MATN = HA.MATN
            WHERE TN.MACUOC = @MACUOC
                AND TN.DAXOA = 0
            ORDER BY
                HA.MATN ASC,
                HA.THUTU ASC
        `)

    const imagesByMessage =
        new Map()

    for (
        const image
        of imageResult.recordset
    ) {
        const messageKey =
            String(image.MATN)

        const currentImages =
            imagesByMessage.get(
                messageKey
            ) || []

        currentImages.push(image)

        imagesByMessage.set(
            messageKey,
            currentImages
        )
    }

    return messageResult.recordset.map(
        message => ({
            ...message,
            HINHANH:
                imagesByMessage.get(
                    String(message.MATN)
                ) || []
        })
    )
}


async function markConversationMessagesAsRead(
    transaction,
    maCuoc,
    nguoiNhan
) {
    const request =
        new sql.Request(transaction)

    request.input(
        'MACUOC',
        sql.BigInt,
        maCuoc
    )

    request.input(
        'NGUOINHAN',
        sql.Int,
        nguoiNhan
    )

    await request.query(`
        UPDATE TINNHAN
        SET
            DADOC = 1,
            THOIGIANDOC = SYSDATETIME()
        WHERE MACUOC = @MACUOC
            AND NGUOINHAN = @NGUOINHAN
            AND DADOC = 0
            AND DAXOA = 0
    `)
}


module.exports = {
    getConversationById,
    getMessagesByConversation,
    getReceiverId,
    insertMessage,
    insertMessageImages,
    markConversationMessagesAsRead,
    updateConversationActivity,
    validateConversation,
    validateParticipant
}