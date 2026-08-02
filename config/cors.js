const localOrigins = [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
]


const configuredOrigins = (
    process.env.CLIENT_ORIGINS || '').split(',').map(origin => origin.trim()).filter(Boolean)

const allowedOrigins = new Set(process.env.NODE_ENV === 'production' ? configuredOrigins
        : [
            ...localOrigins,
            ...configuredOrigins
        ]
)


if (process.env.NODE_ENV === 'production' &&  allowedOrigins.size === 0) {
    throw new Error('Thiếu CLIENT_ORIGINS trong môi trường production!')
}


function validateOrigin(origin, callback) {
    if (!origin) {
        return callback(null, true)
    }

    if (allowedOrigins.has(origin)) {
        return callback(null, true)
    }

    const error = new Error('Nguồn gửi yêu cầu không được phép!')

    error.status = 403

    return callback(error)
}


const corsOptions = {
    origin: validateOrigin,

    methods: [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS'
    ],

    allowedHeaders: [
        'Content-Type',
        'Authorization'
    ],

    credentials: false,

    optionsSuccessStatus: 204
}


module.exports = {
    corsOptions
}