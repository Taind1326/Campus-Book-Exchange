const sql = require('mssql')


function getRequiredEnv(name) {
    const value = process.env[name]

    if (!value || !value.trim()) {
        throw new Error(`Thiếu biến môi trường ${name}!`)
    }

    return value.trim()
}


function getDatabaseConfig() {
    const port = Number(process.env.DB_PORT || 1433)

    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
        throw new Error('DB_PORT không hợp lệ!')
    }

    return {
        user: getRequiredEnv('DB_USER'),
        password: getRequiredEnv('DB_PASSWORD'),
        server: getRequiredEnv('DB_SERVER'),
        database: getRequiredEnv('DB_DATABASE'),
        port,

        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000
        },

        options: {
            encrypt:
                String(process.env.DB_ENCRYPT).toLowerCase()
                === 'true',

            trustServerCertificate:
                String(
                    process.env.DB_TRUST_SERVER_CERTIFICATE
                ).toLowerCase() === 'true'
        }
    }
}


async function connectDB() {
    try {
        const config = getDatabaseConfig()

        await sql.connect(config)

        console.log('Đã kết nối cơ sở dữ liệu')
    }

    catch (error) {
        console.error('Không thể kết nối cơ sở dữ liệu:', error.message)
        throw error
    }
}


module.exports = {
    sql,
    connectDB
}