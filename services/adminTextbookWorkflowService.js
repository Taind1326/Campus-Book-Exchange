const {sql} = require('../config/db')
const {getIO} = require('../config/socket')

const {
    getTextbookForModerationWithLock: getTextbookForModerationWithLockService,
    hideTextbook: hideTextbookService,
    restoreTextbook: restoreTextbookService,
    softDeleteTextbook: softDeleteTextbookService
} = require('./adminTextbookService')

const {
    createTextbookHiddenNotification: createTextbookHiddenNotificationService,
    createTextbookRestoredNotification: createTextbookRestoredNotificationService,
    createTextbookDeletedNotification: createTextbookDeletedNotificationService
} = require('./notificationService')

const {
    insertAdminAuditLog: insertAdminAuditLogService
} = require('./adminAuditService')


function createError(message, status) {
    const error = new Error(message)
    error.status = status
    return error
}


function formatTextbookData(textbook) {
    return {
        maGT: textbook.MAGT,
        tenGT: textbook.TENGT,
        nguoiDang: textbook.NGUOIDANG,
        loai: textbook.LOAI,
        soLuong: textbook.SOLUONG,
        soLuongDangGiu: textbook.SOLUONGDANGGIU,
        trangThai: textbook.TRANGTHAI,
        ngayCapNhat: textbook.NGAYCAPNHAT
    }
}


function formatModeratedTextbook(textbook, adminId) {
    return {
        ...formatTextbookData(textbook),
        nguoiXuLy: adminId
    }
}


async function executeTextbookModeration(maGT, adminId, auditContext, auditInfo, validateAction, updateAction, createNotification) {
    const transaction = new sql.Transaction()
    let transactionStarted = false

    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE)

        transactionStarted = true

        const textbook = await getTextbookForModerationWithLockService(transaction, maGT)

        validateAction(textbook)

        const updatedTextbook = await updateAction(transaction, textbook)
        const notification = await createNotification(transaction, updatedTextbook)

        await insertAdminAuditLogService(
            transaction,
            {
                adminId,
                hanhDong: auditInfo.hanhDong,
                doiTuong: 'Giáo trình',
                maDoiTuong: textbook.MAGT,
                duLieuTruoc: formatTextbookData(textbook),
                duLieuSau: formatTextbookData(updatedTextbook),
                lyDo: auditInfo.lyDo ?? null,
                ip: auditContext.ip ?? null,
                userAgent: auditContext.userAgent ?? null
            }
        )

        await transaction.commit()
        transactionStarted = false

        try {
            const io = getIO()

            io.to(`user:${notification.NGUOINHAN}`).emit('notification:new', notification)
        }

        catch (socketError) {
            console.error('Lỗi gửi realtime quản lý bài đăng:', socketError)
        }

        return formatModeratedTextbook(updatedTextbook, adminId)
    }

    catch (error) {
        if (transactionStarted) {
            try {
                await transaction.rollback()
            }

            catch (rollbackError) {
                console.error('Lỗi rollback quản lý bài đăng:', rollbackError)
            }
        }

        throw error
    }
}


async function hideTextbookWorkflow(maGT, adminId, data, auditContext = {}) {
    const textbook = await executeTextbookModeration(maGT, adminId, auditContext,
            {
                hanhDong: 'Tạm ẩn bài đăng',
                lyDo: data.lyDo
            },

            currentTextbook => {
                const validStatuses = [
                    'Đang hiển thị',
                    'Hết hàng'
                ]

                if (!validStatuses.includes(currentTextbook.TRANGTHAI)) {
                    throw createError('Bài đăng không ở trạng thái có thể tạm ẩn!', 409)
                }

                if (Number(currentTextbook.SOLUONGDANGGIU) > 0) {
                    throw createError('Không thể tạm ẩn bài đang có giao dịch!', 409)
                }
            },

            (transaction, currentTextbook) => hideTextbookService(transaction, currentTextbook.MAGT),
            (transaction, updatedTextbook) => createTextbookHiddenNotificationService(transaction, updatedTextbook, data.lyDo                )
        )

    return {
        ...textbook,
        lyDo: data.lyDo
    }
}


async function restoreTextbookWorkflow(maGT, adminId, auditContext = {}) {
    return executeTextbookModeration(maGT, adminId, auditContext,
        {
            hanhDong: 'Khôi phục bài đăng',
            lyDo: null
        },

        currentTextbook => {
            if (currentTextbook.TRANGTHAI !== 'Tạm ẩn') {
                throw createError('Chỉ bài đang tạm ẩn mới có thể khôi phục!', 409)
            }

            const blockedAccountStatuses = [
                'Tạm khóa',
                'Đã khóa'
            ]

            if (blockedAccountStatuses.includes(currentTextbook.TRANGTHAINGUOIDANG)) {
                throw createError('Không thể khôi phục bài của tài khoản đang bị khóa!', 409)
            }
        },

        (transaction, currentTextbook) => restoreTextbookService(transaction, currentTextbook.MAGT),
        (transaction, updatedTextbook) => createTextbookRestoredNotificationService(transaction, updatedTextbook)
    )
}


async function deleteTextbookWorkflow(maGT, adminId, auditContext = {}) {
    return executeTextbookModeration(maGT, adminId, auditContext,
        {
            hanhDong: 'Xóa bài đăng',
            lyDo: null
        },

        currentTextbook => {
            const validStatuses = [
                'Đang hiển thị',
                'Tạm ẩn',
                'Hết hàng'
            ]

            if (!validStatuses.includes(currentTextbook.TRANGTHAI)) {
                throw createError('Bài đăng không ở trạng thái có thể xóa!', 409)
            }

            if (Number(currentTextbook.SOLUONGDANGGIU) > 0) {
                throw createError('Không thể xóa bài đang có giao dịch!', 409)
            }
        },

        (transaction, currentTextbook) => softDeleteTextbookService(transaction, currentTextbook.MAGT),
        (transaction, updatedTextbook) => createTextbookDeletedNotificationService(transaction, updatedTextbook)
    )
}


module.exports = {
    hideTextbookWorkflow,
    restoreTextbookWorkflow,
    deleteTextbookWorkflow
}