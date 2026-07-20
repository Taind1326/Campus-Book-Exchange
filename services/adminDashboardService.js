const {sql} = require('../config/db')


async function getAdminDashboard() {
    const result = await sql.query`
        SELECT *
        FROM V_ADMIN_DASHBOARD`

    if (result.recordset.length === 0){
        return {}
    }

    return result.recordset[0]
}


module.exports = {getAdminDashboard}