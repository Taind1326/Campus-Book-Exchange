const express = require('express')
const sql = require('mssql')

const app = express()
app.use(express.json())

const config = {
    user: 'sa',
    password: '123456',
    server: 'localhost',
    database: 'QUANLI_SACH',
    port: 1433,
    options: { 
        trustServerCertificate: true
    }
}


app.get('/', async(req, res) => {
    try {
        await sql.connect(config)
        const result  = await sql.query`SELECT GETDATE() AS time`
        res.json(result.recordset)
    }
    catch(error){
        console.log(error)
        res.send(error.message)
    }
})


app.listen(3000, () => {console.log('http://localhost:3000')})