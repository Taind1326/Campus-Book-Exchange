const express = require('express')
const {sql, connectDB} = require('./config/db')
const textBookRoutes = require('./routes/textbookRoutes')
const authRoutes = require('./routes/authRoutes')

const app = express()
const PORT = 3000

app.use(express.json())

app.use('/auth', authRoutes)
app.use('/giaotrinh', textBookRoutes)

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

        app.listen(PORT, () => {console.log(`Server chạy tại http://localhost:${PORT}`)})
    }

    catch(error){
        console.log('Không thể khởi động server: ',error.message)
    }
}


startServer()