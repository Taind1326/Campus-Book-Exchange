require('dotenv').config()

const http = require('http')
const {Server} = require('socket.io')
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const {connectDB} = require('./config/db')
const {setIO} = require('./config/socket')
const {initializeSocket} = require('./sockets/socketServer')
const {corsOptions} = require('./config/cors')
const {apiRateLimit} = require('./middlewares/apiRateLimit')
const textBookRoutes = require('./routes/textbookRoutes')
const authRoutes = require('./routes/authRoutes')
const courseRoutes = require('./routes/courseRoutes')
const orderRoutes = require('./routes/orderRoutes')
const notificationRoutes = require('./routes/notificationRoutes')
const messageRoutes = require('./routes/messageRoutes')
const conversationRoutes = require('./routes/conversationRoutes')
const reviewRoutes = require('./routes/reviewRoutes')
const reportRoutes = require('./routes/reportRoutes')
const adminDashboardRoutes = require('./routes/adminDashboardRoutes')
const adminReportRoutes = require('./routes/adminReportRoutes')
const adminTextbookRoutes = require('./routes/adminTextbookRoutes')
const supportRoutes = require('./routes/supportRoutes')
const adminSupportRoutes = require('./routes/adminSupportRoutes')
const adminAccountRoutes = require('./routes/adminAccountRoutes')
const adminAuditRoutes = require('./routes/adminAuditRoutes')


const app = express()
app.disable('x-powered-by')

if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1)
}

const server = http.createServer(app)

const io = new Server(server, {
    cors: corsOptions,
    serveClient: false,
    connectTimeout: 10 * 1000,
    maxHttpBufferSize: 100 * 1024,
    perMessageDeflate: false
})

setIO(io)

initializeSocket(io)

const PORT = Number(process.env.PORT || 3000)

const helmetOptions = {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: {policy: 'cross-origin'}
}

if (process.env.NODE_ENV !== 'production') {
    helmetOptions.strictTransportSecurity = false
}

app.use(helmet(helmetOptions))
app.use(cors(corsOptions))

app.get('/health', (req, res) => {
    return res.status(200).json({status: 'ok'})
})

app.use(apiRateLimit)
app.use(express.json({
    limit: '100kb'
}))

app.use(express.urlencoded({
    extended: true,
    limit: '100kb'
}))

app.use('/auth', authRoutes)
app.use('/giaotrinh', textBookRoutes)
app.use('/monhoc', courseRoutes)
app.use('/orders', orderRoutes)
app.use('/notifications', notificationRoutes)
app.use('/messages', messageRoutes)
app.use('/conversations', conversationRoutes)
app.use('/reviews', reviewRoutes)
app.use('/reports', reportRoutes)
app.use('/admin/dashboard', adminDashboardRoutes)
app.use('/admin/reports', adminReportRoutes)
app.use('/admin/textbooks', adminTextbookRoutes)
app.use('/support', supportRoutes)
app.use('/admin/support', adminSupportRoutes)
app.use('/admin/accounts', adminAccountRoutes)
app.use('/admin/audits', adminAuditRoutes)


app.get('/', (req, res) => {
    return res.status(200).json({name: 'Campus Book Exchange API', status: 'running'})
})


async function startServer() {
    try {
        await connectDB()

        server.listen(PORT, () => {console.log(`Server chạy tại http://localhost:${PORT}`)})
    }

    catch(error){
        console.log('Không thể khởi động server: ',error.message)
    }
}

app.use((req, res) => {
    return res.status(404).json({message: 'Không tìm thấy API!'})
})


app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error)
    }

    if (error.type === 'entity.too.large') {
        return res.status(413).json({message: 'Dữ liệu gửi lên vượt quá giới hạn cho phép!'})
    }

    if (error instanceof SyntaxError && error.status === 400 && error.type === 'entity.parse.failed') {
        return res.status(400).json({message: 'Dữ liệu JSON không hợp lệ!'})
    }

    if (error.name === 'MulterError') {
        const multerMessages = {
            LIMIT_FILE_SIZE: 'Ảnh không được vượt quá 5 MB!',

            LIMIT_FILE_COUNT: 'Chỉ được tải lên tối đa 5 ảnh!',

            LIMIT_UNEXPECTED_FILE: 'Trường tải ảnh không hợp lệ!'
        }

        return res.status(400).json({
            message: multerMessages[error.code] || 'Dữ liệu ảnh tải lên không hợp lệ!'})
    }

    if (error.status) {
        return res.status(error.status).json({message: error.message})
    }

    console.error('Lỗi server chưa được xử lý:', error)

    return res.status(500).json({message: 'Đã xảy ra lỗi hệ thống!'})
})


startServer()