const express = require('express')
const {sql, connectDB} = require('./config/db')
const textBookRoutes = require('./routes/textbookRoutes')

const app = express()

app.use(express.json())

connectDB()

app.use('/giaotrinh', textBookRoutes)

app.get('/', async (req, res) => {
    try {
        const result = await sql.query`SELECT GETDATE() AS time`
        res.json(result.recordset)
    }

    catch(error){
        console.log(error)
        res.status(500).send(error.message)
    }
})

app.listen(3000, () => {
    console.log('Server chay tai http://localhost:3000')
})