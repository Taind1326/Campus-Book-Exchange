const sql = require('mssql')

const config = {
    user: 'sa',
    password: '123456',
    server: 'localhost',
    database: 'QUANLI_SACH',
    port: 1433,
    options: {trustServerCertificate: true}
}


async function connectDB() {
    try{
        await sql.connect(config)
        console.log('Da ket noi server')
    }
    
    catch(error){
        console.log('Loi ket noi server', error.message)
    }
}


module.exports = {sql, connectDB}