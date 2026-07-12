const {sql} = require('../config/db')

async function getAllTextbooks(req, res) {
    try{
        const result = await sql.query`SELECT*
                                        FROM GIAOTRINH
                                        ORDER BY NGAYDANG DESC`
        res.json(result.recordset)
    }

    catch(error){
        console.log(error)
        res.status(500).json({message:'Loi lay danh sach giao trinh'})
    }
}


module.exports = {getAllTextbooks}