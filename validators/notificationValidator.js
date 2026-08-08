function validateNotificationId(id) {
    const notificationId = Number(id)


    if (
        !Number.isInteger(notificationId) ||
        notificationId <= 0
    ) {
        return {
            isValid: false,
            status: 400,
            message:
                'Mã thông báo không hợp lệ!'
        }
    }


    return {
        isValid: true,
        data: notificationId
    }
}


function normalizeOptionalText(
    value,
    maximumLength
) {
    if (
        value === undefined ||
        value === null
    ) {
        return null
    }


    if (typeof value !== 'string') {
        return null
    }


    const normalizedValue =
        value.trim()


    if (!normalizedValue) {
        return null
    }


    return normalizedValue.slice(
        0,
        maximumLength
    )
}


function validateFcmToken(token) {
    if (
        typeof token !== 'string' ||
        !token.trim()
    ) {
        return {
            isValid: false,
            status: 400,
            message:
                'Token thông báo không được để trống!'
        }
    }


    const normalizedToken =
        token.trim()


    if (normalizedToken.length > 1000) {
        return {
            isValid: false,
            status: 400,
            message:
                'Token thông báo không hợp lệ!'
        }
    }


    if (!/^[\x21-\x7E]+$/.test(
        normalizedToken
    )) {
        return {
            isValid: false,
            status: 400,
            message:
                'Token thông báo không hợp lệ!'
        }
    }


    return {
        isValid: true,
        data: normalizedToken
    }
}


function validatePushDevice(body = {}) {
    const tokenValidation =
        validateFcmToken(body.token)


    if (!tokenValidation.isValid) {
        return tokenValidation
    }


    return {
        isValid: true,
        data: {
            token: tokenValidation.data,

            deviceName:
                normalizeOptionalText(
                    body.deviceName,
                    200
                ),

            browser:
                normalizeOptionalText(
                    body.browser,
                    100
                ),

            platform:
                normalizeOptionalText(
                    body.platform,
                    50
                ) || 'Web'
        }
    }
}


function validatePushToken(body = {}) {
    const tokenValidation =
        validateFcmToken(body.token)


    if (!tokenValidation.isValid) {
        return tokenValidation
    }


    return {
        isValid: true,
        data: {
            token: tokenValidation.data
        }
    }
}


module.exports = {
    validateNotificationId,
    validatePushDevice,
    validatePushToken
}