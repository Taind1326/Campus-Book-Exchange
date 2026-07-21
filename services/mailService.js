const nodemailer = require('nodemailer')

let transporter = null

function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        })[char]
    )
}


function getTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,

            port: Number(
                process.env.SMTP_PORT || 587
            ),

            secure:
                String(process.env.SMTP_SECURE).toLowerCase()
                === 'true',

            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        })
    }

    return transporter
}


async function sendVerificationOtp(email, tenSV, otp) {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        const error = new Error('Chưa cấu hình dịch vụ gửi email!')
        error.code = 'EMAIL_NOT_CONFIGURED'
        throw error
    }

    const safeName = escapeHtml(tenSV)

    await getTransporter().sendMail({
        from:
            process.env.MAIL_FROM ||
            process.env.SMTP_USER,

        to: email,

        subject:
            'Mã xác minh Campus Book Exchange',

        text:
            `Xin chào ${tenSV}, mã xác minh tài khoản ` +
            `Campus Book Exchange của bạn là ${otp}. ` +
            'Mã có hiệu lực trong 10 phút. ' +
            'Không chia sẻ mã này cho người khác.',

        html: `
            <div style="
                font-family: Arial, sans-serif;
                max-width: 560px;
                margin: auto;
                color: #1f2937;
            ">
                <h2 style="color: #1d4ed8;">
                    HUIT Textbook Exchange
                </h2>

                <p>
                    Xin chào <strong>${safeName}</strong>,
                </p>

                <p>Mã xác minh email của bạn là:</p>

                <p style="
                    font-size: 32px;
                    font-weight: 700;
                    letter-spacing: 8px;
                    color: #1d4ed8;
                ">
                    ${otp}
                </p>

                <p>
                    Mã có hiệu lực trong
                    <strong>10 phút</strong>.
                </p>

                <p>
                    Không chia sẻ mã này cho người khác.
                </p>
            </div>
        `
    })
}


module.exports = {
    sendVerificationOtp
}