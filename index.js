const http = require('http')
const {Server} = require('socket.io')

require('dotenv').config()

const express = require('express')
const {sql, connectDB} = require('./config/db')
const {setIO} = require('./config/socket')
const {initializeSocket} = require('./sockets/socketServer')
const textBookRoutes = require('./routes/textbookRoutes')
const authRoutes = require('./routes/authRoutes')
const cloudinary = require('./config/cloudinary')
const courseRoutes = require('./routes/courseRoutes')
const orderRoutes = require('./routes/orderRoutes')
const notificationRoutes = require('./routes/notificationRoutes')
const messageRoutes = require('./routes/messageRoutes')
const conversationRoutes = require('./routes/conversationRoutes')


const app = express()

const server = http.createServer(app)

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PATCH']
    }
})
setIO(io)

initializeSocket(io)

const PORT = 3000

app.use(express.json())

app.use('/auth', authRoutes)
app.use('/giaotrinh', textBookRoutes)
app.use('/monhoc', courseRoutes)
app.use('/orders', orderRoutes)
app.use('/notifications', notificationRoutes)
app.use('/messages', messageRoutes)
app.use('/conversations', conversationRoutes)


app.get('/', async (req, res) => {
    try {
        const result = await sql.query`SELECT GETDATE() AS time`
        res.status(200).json(result.recordset[0])
    }

    catch(error){
        console.log(error)
        res.status(500).json({message: 'Lỗi kiểm tra kết nối server!'})
    }
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


startServer()