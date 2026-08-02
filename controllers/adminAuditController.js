const {
    getAdminAuditLogs: getAdminAuditLogsService,
    getAdminAuditDetail: getAdminAuditDetailService
} = require('../services/adminAuditService')

const {
    validateAdminAuditListQuery,
    validateAuditId
} = require('../validators/adminAuditValidator')


function handleAdminAuditError(res, error, action) {
    console.log(`Lỗi ${action}:`, error)

    if (error.status) {
        return res.status(error.status).json({message: error.message})
    }

    return res.status(500).json({message: `Không thể ${action}!`})
}


async function getAdminAuditLogs(req, res) {
    const validation = validateAdminAuditListQuery(req.query)

    if (!validation.isValid) {
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        const result = await getAdminAuditLogsService(validation.data)

        return res.status(200).json(result)
    }

    catch (error) {
        return handleAdminAuditError(res, error, 'lấy danh sách nhật ký quản trị')
    }
}


async function getAdminAuditDetail(req, res) {
    const validation = validateAuditId(req.params.auditId)

    if (!validation.isValid) {
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        const audit = await getAdminAuditDetailService(validation.data.auditId)

        return res.status(200).json({audit})
    }

    catch (error) {
        return handleAdminAuditError(res, error, 'lấy chi tiết nhật ký quản trị')
    }
}


module.exports = {
    getAdminAuditLogs,
    getAdminAuditDetail
}