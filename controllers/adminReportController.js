const {
    getAdminReports: getAdminReportsService,
    getAdminReportDetail: getAdminReportDetailService
} = require('../services/adminReportService')

const {
    validateAdminReportListQuery,
    validateReportId,
    validateResolveReport
} = require('../validators/adminReportValidator')


const {
    claimReportWorkflow,
    resolveReportWorkflow
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
        const report = await claimReportWorkflow(validation.data.maBC, req.user.MATK, getAuditContext(req))

        return res.status(200).json({message: 'Nhận xử lý báo cáo thành công!', report})
    }

    catch (error) {
        return handleAdminReportError(res, error, 'nhận xử lý báo cáo')
    }
}


async function resolveReport(req, res) {
    const idValidation = validateReportId(req.params.maBC)

    if (!idValidation.isValid) {
        return res.status(idValidation.status).json({message: idValidation.message})
    }

    const bodyValidation = validateResolveReport(req.body)

    if (!bodyValidation.isValid) {
        return res.status(bodyValidation.status).json({message: bodyValidation.message})
    }

    try {
        const report = await resolveReportWorkflow(idValidation.data.maBC, req.user.MATK, bodyValidation.data, getAuditContext(req))

        return res.status(200).json({message: 'Kết luận báo cáo thành công!', report})
    }

    catch (error) {
        return handleAdminReportError(res, error, 'kết luận báo cáo')
    }
}

function getAuditContext(req) {
    const ip = typeof req.ip === 'string' ? req.ip.slice(0, 45) : null
    const userAgent = req.get('user-agent')

    return {
        ip,
        userAgent:
            typeof userAgent === 'string'
                ? userAgent.slice(0, 500)
                : null
    }
}


module.exports = {
    getAdminReports,
    getAdminReportDetail,
    claimReport,
    resolveReport
}