const {sql} = require('../config/db')
const {getIO} = require('../config/socket')

const {
    getSupportForProcessingWithLock: getSupportForProcessingWithLockService,
    validateSupportAssignment: validateSupportAssignmentService,
    assignSupport: assignSupportService,
    validateSupportPriorityUpdate: validateSupportPriorityUpdateService,
    updateSupportPriority: updateSupportPriorityService,
    validateSupportReplyAction: validateSupportReplyActionService,
    replySupport: replySupportService,
    validateSupportClosure: validateSupportClosureService,
    closeSupport: closeSupportService
} = require('./adminSupportService')

const {
    createSupportReplyNotification: createSupportReplyNotificationService,
    createSupportClosedNotification: createSupportClosedNotificationService
} = require('./notificationService')

const {
    insertAdminAuditLog: insertAdminAuditLogService
} = require('./adminAuditService')


function formatSupportData(support) {
    return {
        maPhanHoi: support.MAPHANHOI,
        nguoiGui: support.NGUOIGUI,
        loaiPhanHoi: support.LOAIPHANHOI,
        tieuDe: support.TIEUDE,
        mucDoUuTien: support.MUCDOUUTIEN,
        trangThai: support.TRANGTHAI,
        nguoiXuLy: support.NGUOIXULY,
        cauTraLoi: support.CAUTRALOI,
        ngayXuLy: support.NGAYXULY,
        ngayCapNhat: support.NGAYCAPNHAT
    }
}


async function insertSupportAuditLog(transaction, adminId, hanhDong, supportBefore, supportAfter, auditContext) {
    await insertAdminAuditLogService(
        transaction,
        {
            adminId,
            hanhDong,
            doiTuong: 'Phản hồi hỗ trợ',
            maDoiTuong: supportBefore.MAPHANHOI,
            duLieuTruoc: formatSupportData(supportBefore),
            duLieuSau: formatSupportData(supportAfter),
            lyDo: null,
            ip: auditContext.ip ?? null,
            userAgent: auditContext.userAgent ?? null
        }
    )
}


async function assignSupportWorkflow(maPhanHoi, adminId, auditContext = {}) {
    const transaction = new sql.Transaction()
    let transactionStarted = false

    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE)

        transactionStarted = true

        const support = await getSupportForProcessingWithLockService(transaction, maPhanHoi)

        validateSupportAssignmentService(support)

        const assignedSupport = await assignSupportService(transaction, support.MAPHANHOI, adminId)

        await insertSupportAuditLog(transaction, adminId, 'Nhận xử lý phản hồi', support, assignedSupport, auditContext)

        await transaction.commit()
        transactionStarted = false

        return formatSupportData(assignedSupport)
    }

    catch (error) {
        if (transactionStarted) {
            try {
                await transaction.rollback()
            }

            catch (rollbackError) {
                console.error('Lỗi rollback nhận xử lý phản hồi:', rollbackError)
            }
        }

        throw error
    }
}


async function updateSupportPriorityWorkflow(maPhanHoi, adminId, data, auditContext = {}) {
    const transaction = new sql.Transaction()
    let transactionStarted = false

    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE)

        transactionStarted = true

        const support = await getSupportForProcessingWithLockService(transaction, maPhanHoi)

        validateSupportPriorityUpdateService(support)

        const updatedSupport = await updateSupportPriorityService(transaction, support.MAPHANHOI, data.mucDoUuTien)

        await insertSupportAuditLog(transaction, adminId, 'Cập nhật ưu tiên phản hồi', support, updatedSupport, auditContext)

        await transaction.commit()
        transactionStarted = false

        return formatSupportData(updatedSupport)
    }

    catch (error) {
        if (transactionStarted) {
            try {
                await transaction.rollback()
            }

            catch (rollbackError) {
                console.error('Lỗi rollback đổi mức ưu tiên phản hồi:', rollbackError)
            }
        }

        throw error
    }
}


async function replySupportWorkflow(maPhanHoi, adminId, data, auditContext = {}) {
    const transaction = new sql.Transaction()
    let transactionStarted = false

    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE)

        transactionStarted = true

        const support = await getSupportForProcessingWithLockService(transaction, maPhanHoi)

        validateSupportReplyActionService(support, adminId)

        const repliedSupport = await replySupportService(transaction, support.MAPHANHOI, adminId, data)
        const notification = await createSupportReplyNotificationService(transaction, repliedSupport)

        await insertSupportAuditLog(transaction, adminId, 'Trả lời phản hồi', support, repliedSupport, auditContext)

        await transaction.commit()
        transactionStarted = false

        try {
            const io = getIO()

            io.to(`user:${notification.NGUOINHAN}`).emit('notification:new', notification)
        }

        catch (socketError) {
            console.error('Lỗi gửi realtime trả lời phản hồi:', socketError)
        }

        return formatSupportData(repliedSupport)
    }

    catch (error) {
        if (transactionStarted) {
            try {
                await transaction.rollback()
            }

            catch (rollbackError) {
                console.error('Lỗi rollback trả lời phản hồi:', rollbackError)
            }
        }

        throw error
    }
}


async function closeSupportWorkflow(maPhanHoi, adminId, auditContext = {}) {
    const transaction = new sql.Transaction()
    let transactionStarted = false

    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE)

        transactionStarted = true

        const support = await getSupportForProcessingWithLockService(transaction, maPhanHoi)

        validateSupportClosureService(support, adminId)

        const closedSupport = await closeSupportService(transaction, support.MAPHANHOI, adminId)
        const notification = await createSupportClosedNotificationService(transaction, closedSupport)

        await insertSupportAuditLog(transaction, adminId, 'Đóng phản hồi', support, closedSupport, auditContext)

        await transaction.commit()
        transactionStarted = false

        try {
            const io = getIO()

            io.to(`user:${notification.NGUOINHAN}`).emit('notification:new', notification)
        }

        catch (socketError) {
            console.error('Lỗi gửi realtime đóng phản hồi:', socketError)
        }

        return formatSupportData(closedSupport)
    }

    catch (error) {
        if (transactionStarted) {
            try {
                await transaction.rollback()
            }

            catch (rollbackError) {
                console.error('Lỗi rollback đóng phản hồi:', rollbackError)
            }
        }

        throw error
    }
}


module.exports = {
    assignSupportWorkflow,
    updateSupportPriorityWorkflow,
    replySupportWorkflow,
    closeSupportWorkflow
}