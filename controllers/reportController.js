const {createReport: createReportService} = require('../services/reportWorkflowService')

const {validateCreateReport} = require('../validators/reportValidator')


async function createReport(req, res) {
    const validation = validateCreateReport(req.body)

    if (!validation.isValid) {
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        const report = await createReportService(validation.data, req.user.MATK)

        return res.status(201).json({message: 'Báo cáo đã được tiếp nhận và sẽ được xem xét!', data: report})
    }

    catch (error) {
        console.error('Lỗi gửi báo cáo:', error)

        return res.status(error.status || 500).json({message: error.status ? error.message : 'Không thể gửi báo cáo!'})
    }
}


module.exports = {createReport}