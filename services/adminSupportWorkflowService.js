const {sql} = require('../config/db')

const {getIO} = require('../config/socket')

const {
    getSupportForProcessingWithLock: getSupportForProcessingWithLockService,
    validateSupportAssignment: validateSupportAssignmentService,
    assignSupport: assignSupportService,
    validateSupportPriorityUpdate: validateSupportPriorityUpdateService,
    updateSupportPriority: updateSupportPriorityService,
    validateSupportReplyAction: validateSupportReplyActionService,
    replySupport: replySupportService
} = require('./adminSupportService')

const {
    createSupportReplyNotification: createSupportReplyNotificationService
} = require('./notificationService')


async function assignSupportWorkflow(maPhanHoi, adminId) {
    const transaction = new sql.Transaction()
    let transactionStarted = false

    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE)

        transactionStarted = true

        const support = await getSupportForProcessingWithLockService(transaction, maPhanHoi)

        validateSupportAssignmentService(support)

        const assignedSupport = await assignSupportService(transaction, support.MAPHANHOI, adminId)

        await transaction.commit()
        transactionStarted = false

        return {
            maPhanHoi: assignedSupport.MAPHANHOI,
            nguoiGui: assignedSupport.NGUOIGUI,
            loaiPhanHoi: assignedSupport.LOAIPHANHOI,
            tieuDe: assignedSupport.TIEUDE,
            mucDoUuTien: assignedSupport.MUCDOUUTIEN,
            trangThai: assignedSupport.TRANGTHAI,
            nguoiXuLy: assignedSupport.NGUOIXULY,
            ngayCapNhat: assignedSupport.NGAYCAPNHAT
        }
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


async function updateSupportPriorityWorkflow(maPhanHoi, data) {
    const transaction = new sql.Transaction()
    let transactionStarted = false

    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE)

        transactionStarted = true

        const support = await getSupportForProcessingWithLockService(transaction, maPhanHoi)

        validateSupportPriorityUpdateService(support)

        const updatedSupport = await updateSupportPriorityService(transaction, support.MAPHANHOI, data.mucDoUuTien)

        await transaction.commit()
        transactionStarted = false

        return {
            maPhanHoi: updatedSupport.MAPHANHOI,
            nguoiGui: updatedSupport.NGUOIGUI,
            mucDoUuTien: updatedSupport.MUCDOUUTIEN,
            trangThai: updatedSupport.TRANGTHAI,
            nguoiXuLy: updatedSupport.NGUOIXULY,
            ngayCapNhat: updatedSupport.NGAYCAPNHAT
        }
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



async function replySupportWorkflow(maPhanHoi, adminId, data) {
    const transaction = new sql.Transaction()
    let transactionStarted = false

    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE)

        transactionStarted = true

        const support = await getSupportForProcessingWithLockService(transaction, maPhanHoi)

        validateSupportReplyActionService(support, adminId)

        const repliedSupport = await replySupportService(transaction, support.MAPHANHOI, adminId, data)
        const notification = await createSupportReplyNotificationService(transaction, repliedSupport)

        await transaction.commit()
        transactionStarted = false

        try {
            const io = getIO()

            io.to(`user:${notification.NGUOINHAN}`).emit('notification:new', notification)
        }

        catch (socketError) {
            console.error('Lỗi gửi realtime trả lời phản hồi:', socketError)
        }

        return {
            maPhanHoi: repliedSupport.MAPHANHOI,
            nguoiGui: repliedSupport.NGUOIGUI,
            loaiPhanHoi: repliedSupport.LOAIPHANHOI,
            tieuDe: repliedSupport.TIEUDE,
            mucDoUuTien: repliedSupport.MUCDOUUTIEN,
            trangThai: repliedSupport.TRANGTHAI,
            nguoiXuLy: repliedSupport.NGUOIXULY,
            cauTraLoi: repliedSupport.CAUTRALOI,
            ngayXuLy: repliedSupport.NGAYXULY,
            ngayCapNhat: repliedSupport.NGAYCAPNHAT
        }
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


module.exports = {
    assignSupportWorkflow,
    updateSupportPriorityWorkflow,
    replySupportWorkflow
}