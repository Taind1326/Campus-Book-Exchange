const {
    getAdminReports: getAdminReportsService,
    getAdminReportDetail: getAdminReportDetailService
} = require('../services/adminReportService')

const {
    validateAdminReportListQuery,
    validateReportId
} = require('../validators/adminReportValidator')


const {
    claimReportWorkflow
} = require('../services/adminReportWorkflowService')


function handleAdminReportError(res, error, action) {
    console.log(`Lỗi ${action}:`, error)

    if (error.status) {
        return res.status(error.status).json({message: error.message})
    }

    return res.status(500).json({
        message: `Không thể ${action}!`
    })
}


async function getAdminReports(req, res) {
    const validation = validateAdminReportListQuery(req.query)

    if (!validation.isValid) {
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        const result = await getAdminReportsService(validation.data)

        return res.status(200).json(result)
    }

    catch (error) {
        return handleAdminReportError(res, error, 'lấy danh sách báo cáo')
    }
}


async function getAdminReportDetail(req, res) {
    const validation = validateReportId(req.params.maBC)

    if (!validation.isValid) {
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        const report = await getAdminReportDetailService(validation.data.maBC)

        return res.status(200).json({report})
    }

    catch (error) {
        return handleAdminReportError(res, error, 'lấy chi tiết báo cáo')
    }
}


async function claimReport(req, res) {
    const validation = validateReportId(req.params.maBC)

    if (!validation.isValid) {
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        const report = await claimReportWorkflow(validation.data.maBC, req.user.MATK)

        return res.status(200).json({message: 'Nhận xử lý báo cáo thành công!', report})
    }

    catch (error) {
        return handleAdminReportError(res, error, 'nhận xử lý báo cáo')
    }
}

module.exports = {
    getAdminReports,
    getAdminReportDetail,
    claimReport
}