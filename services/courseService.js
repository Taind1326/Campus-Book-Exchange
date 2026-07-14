const {sql} = require('../config/db')

async function getCourses(keyword) {
    const request = new sql.Request()

    const search = keyword?.trim() || ''

    request.input('KEYWORD', sql.NVarChar(300), search)

    const result = await request.query(`
        SELECT TOP (30) MAHOCPHAN, TENMH
        FROM MONHOC
        WHERE @KEYWORD = N''
            OR TENMH LIKE N'%' + @KEYWORD + N'%'
            OR MAHOCPHAN LIKE '%' + @KEYWORD + '%'
        ORDER BY TENMH ASC`)

    return result.recordset
}


module.exports = {getCourses}