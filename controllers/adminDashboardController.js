const {
    getAdminDashboard: getAdminDashboardService
} = require('../services/adminDashboardService')


async function getAdminDashboard(req, res) {
    try {
        const dashboard = await getAdminDashboardService()

        return res.status(200).json(dashboard)
    }

    catch(error){
        console.log('Lỗi lấy dữ liệu dashboard admin: ', error)

        return res.status(500).json({message: 'Không thể lấy dữ liệu dashboard quản trị!'})
    }
}


module.exports = {getAdminDashboard}