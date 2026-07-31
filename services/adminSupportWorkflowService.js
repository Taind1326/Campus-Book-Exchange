const {sql} = require('../config/db')

const {
    getSupportForProcessingWithLock: getSupportForProcessingWithLockService,
    validateSupportAssignment: validateSupportAssignmentService,
    assignSupport: assignSupportService,
    validateSupportPriorityUpdate: validateSupportPriorityUpdateService,
    updateSupportPriority: updateSupportPriorityService
} = require('./adminSupportService')


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


module.exports = {
    assignSupportWorkflow,
    updateSupportPriorityWorkflow
}