const BREVO_API_URL =
    'https://api.brevo.com/v3/smtp/email'

const EMAIL_REQUEST_TIMEOUT_MS = 15000
const OTP_EXPIRES_MINUTES = 10


function createMailError(
    message,
    code,
    details = null
) {
    const error = new Error(message)
    error.code = code
    error.details = details

    return error
}


function getBrevoConfiguration() {
    const apiKey =
        process.env.BREVO_API_KEY?.trim()

    const senderEmail =
        process.env.BREVO_SENDER_EMAIL?.trim()

    const senderName =
        process.env.BREVO_SENDER_NAME?.trim() ||
        'Campus Book Exchange'

    const templateId =
        Number(
            process.env.BREVO_TEMPLATE_ID
        )


    if (
        !apiKey ||
        !senderEmail ||
        !Number.isInteger(templateId) ||
        templateId <= 0
    ) {
        throw createMailError(
            'Chưa cấu hình đầy đủ dịch vụ Brevo!',
            'EMAIL_NOT_CONFIGURED'
        )
    }


    return {
        apiKey,
        senderEmail,
        senderName,
        templateId
    }
}


async function readResponseBody(
    response
) {
    const responseText =
        await response.text()

    if (!responseText) {
        return null
    }

    try {
        return JSON.parse(responseText)
    }

    catch {
        return {
            message: responseText
        }
    }
}


async function sendVerificationOtp(
    email,
    tenSV,
    otp
) {
    const {
        apiKey,
        senderEmail,
        senderName,
        templateId
    } = getBrevoConfiguration()

    const controller =
        new AbortController()

    const timeoutId = setTimeout(
        () => controller.abort(),
        EMAIL_REQUEST_TIMEOUT_MS
    )


    try {
        const response = await fetch(
            BREVO_API_URL,
            {
                method: 'POST',

                headers: {
                    accept:
                        'application/json',

                    'api-key':
                        apiKey,

                    'content-type':
                        'application/json'
                },

                body: JSON.stringify({
                    sender: {
                        email: senderEmail,
                        name: senderName
                    },

                    to: [
                        {
                            email,
                            name: tenSV
                        }
                    ],

                    templateId,

                    params: {
                        OTP: String(otp),

                        TEN_SV:
                            tenSV,

                        EXPIRES_MINUTES:
                            OTP_EXPIRES_MINUTES
                    }
                }),

                signal: controller.signal
            }
        )

        const responseBody =
            await readResponseBody(
                response
            )

        if (!response.ok) {
            throw createMailError(
                responseBody?.message ||
                'Brevo từ chối gửi email!',
                'BREVO_EMAIL_REJECTED',
                {
                    status: response.status,
                    response: responseBody
                }
            )
        }

        return responseBody
    }

    catch (error) {
        if (
            error.code ===
                'BREVO_EMAIL_REJECTED' ||
            error.code ===
                'EMAIL_NOT_CONFIGURED'
        ) {
            throw error
        }

        if (error.name === 'AbortError') {
            throw createMailError(
                'Brevo phản hồi quá thời gian!',
                'BREVO_EMAIL_TIMEOUT'
            )
        }

        throw createMailError(
            'Không thể kết nối đến Brevo!',
            'BREVO_EMAIL_CONNECTION_FAILED',
            {
                message: error.message
            }
        )
    }

    finally {
        clearTimeout(timeoutId)
    }
}


module.exports = {
    sendVerificationOtp
}