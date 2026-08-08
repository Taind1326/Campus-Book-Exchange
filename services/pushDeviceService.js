const {sql} = require('../config/db')


async function registerPushDevice(
    accountId,
    device
) {
    const request = new sql.Request()

    request.input(
        'MATK',
        sql.Int,
        accountId
    )

    request.input(
        'FCM_TOKEN',
        sql.VarChar(1000),
        device.token
    )

    request.input(
        'TEN_THIETBI',
        sql.NVarChar(200),
        device.deviceName || null
    )

    request.input(
        'TRINHDUYET',
        sql.NVarChar(100),
        device.browser || null
    )

    request.input(
        'NEN_TANG',
        sql.NVarChar(50),
        device.platform || 'Web'
    )


    const result = await request.query(`
        MERGE THIETBITHONGBAO WITH (HOLDLOCK)
            AS TARGET

        USING (
            SELECT
                @FCM_TOKEN AS FCM_TOKEN
        ) AS SOURCE

        ON TARGET.FCM_TOKEN =
            SOURCE.FCM_TOKEN

        WHEN MATCHED THEN
            UPDATE SET
                MATK = @MATK,
                TEN_THIETBI =
                    @TEN_THIETBI,
                TRINHDUYET =
                    @TRINHDUYET,
                NEN_TANG =
                    @NEN_TANG,
                TRANGTHAI =
                    N'Hoạt động',
                LANCAPNHAT =
                    SYSDATETIME()

        WHEN NOT MATCHED THEN
            INSERT (
                MATK,
                FCM_TOKEN,
                TEN_THIETBI,
                TRINHDUYET,
                NEN_TANG,
                TRANGTHAI
            )
            VALUES (
                @MATK,
                @FCM_TOKEN,
                @TEN_THIETBI,
                @TRINHDUYET,
                @NEN_TANG,
                N'Hoạt động'
            )

        OUTPUT
            INSERTED.MATHIETBI,
            INSERTED.MATK,
            INSERTED.TEN_THIETBI,
            INSERTED.TRINHDUYET,
            INSERTED.NEN_TANG,
            INSERTED.TRANGTHAI,
            INSERTED.LANCAPNHAT;
    `)


    return result.recordset[0]
}


async function deactivatePushDevice(
    accountId,
    token
) {
    const request = new sql.Request()

    request.input(
        'MATK',
        sql.Int,
        accountId
    )

    request.input(
        'FCM_TOKEN',
        sql.VarChar(1000),
        token
    )


    const result = await request.query(`
        UPDATE THIETBITHONGBAO
        SET
            TRANGTHAI = N'Đã hủy',
            LANCAPNHAT = SYSDATETIME()
        WHERE
            MATK = @MATK
            AND FCM_TOKEN = @FCM_TOKEN
            AND TRANGTHAI =
                N'Hoạt động';
    `)


    return result.rowsAffected[0] > 0
}


async function getActivePushTokens(
    accountId
) {
    const request = new sql.Request()

    request.input(
        'MATK',
        sql.Int,
        accountId
    )


    const result = await request.query(`
        SELECT FCM_TOKEN
        FROM THIETBITHONGBAO
        WHERE
            MATK = @MATK
            AND TRANGTHAI =
                N'Hoạt động'
        ORDER BY LANCAPNHAT DESC;
    `)


    return result.recordset.map(
        device => device.FCM_TOKEN
    )
}


async function deactivateInvalidPushTokens(
    tokens
) {
    if (
        !Array.isArray(tokens) ||
        tokens.length === 0
    ) {
        return
    }


    const request = new sql.Request()

    request.input(
        'TOKENS',
        sql.NVarChar(sql.MAX),
        JSON.stringify(tokens)
    )


    await request.query(`
        UPDATE THIETBITHONGBAO
        SET
            TRANGTHAI = N'Đã hủy',
            LANCAPNHAT = SYSDATETIME()
        WHERE FCM_TOKEN IN (
            SELECT CONVERT(
                VARCHAR(1000),
                [value]
            )
            FROM OPENJSON(@TOKENS)
        );
    `)
}


module.exports = {
    deactivateInvalidPushTokens,
    deactivatePushDevice,
    getActivePushTokens,
    registerPushDevice
}