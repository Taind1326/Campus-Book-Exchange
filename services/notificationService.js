const {sql} = require('../config/db')

async function insertNotification(transaction, data) {
    const request = new sql.Request(transaction)

    request.input('NGUOINHAN', sql.Int, data.nguoiNhan)
    request.input('TIEUDE', sql.NVarChar(200), data.tieuDe)
    request.input('NOIDUNG', sql.NVarChar(1000), data.noiDung)
    request.input('LOAI', sql.NVarChar(50), data.loai)
    request.input('MADH', sql.Int, data.maDH ?? null)
    request.input('MAGT', sql.Int, data.maGT ?? null)
    request.input('MACUOC', sql.BigInt, data.maCuoc ?? null)
    request.input('MATN', sql.BigInt, data.maTN ?? null)
    request.input('MADG', sql.BigInt, data.maDG ?? null)
    request.input('DUONGDAN', sql.NVarChar(500), data.duongDan ?? null)

    const result = await request.query(`
        INSERT INTO THONGBAO (NGUOINHAN, TIEUDE, NOIDUNG, LOAI, MADH, MAGT, MACUOC, MATN, MADG, DUONGDAN)
        OUTPUT INSERTED.MATB, INSERTED.NGUOINHAN, INSERTED.TIEUDE, INSERTED.NOIDUNG,
                INSERTED.LOAI, INSERTED.MADH, INSERTED.MAGT, INSERTED.MACUOC,
                INSERTED.MATN, INSERTED.MADG, INSERTED.DUONGDAN, INSERTED.DADOC, INSERTED.THOIGIAN
        VALUES (@NGUOINHAN, @TIEUDE, @NOIDUNG, @LOAI, @MADH, @MAGT, @MACUOC, @MATN, @MADG, @DUONGDAN)`)

    return result.recordset[0]
}


async function createOrderNotification(transaction, textbook, maDH, maCuoc) {
    return insertNotification(transaction, {
        nguoiNhan: textbook.NGUOIDANG,
        tieuDe: 'Yêu cầu giao dịch mới',
        noiDung: `Bạn có một yêu cầu giao dịch mới cho giáo trình "${textbook.TENGT}".`,
        loai: 'Đơn hàng',
        maDH,
        maGT: textbook.MAGT,
        maCuoc
    })
}


async function createOrderConfirmedNotification(transaction, order) {
    return insertNotification(transaction, {
        nguoiNhan: order.NGUOIMUA,
        tieuDe: 'Yêu cầu giao dịch đã được xác nhận',
        noiDung:
            `Người bán đã xác nhận yêu cầu giao dịch ` +
            `giáo trình "${order.TENGT}".`,
        loai: 'Đơn hàng',
        maDH: order.MADH,
        maGT: order.MAGT,
        duongDan: `/orders/${order.MADH}`
    })
}


async function createOrderRejectedNotification(transaction, rejectedOrder, tenGT) {
    return insertNotification(transaction, {
        nguoiNhan: rejectedOrder.NGUOIMUA,
        tieuDe: 'Yêu cầu giao dịch không còn đủ số lượng',
        noiDung:
            `Yêu cầu giao dịch giáo trình "${tenGT}" ` +
            `đã bị từ chối vì số lượng còn lại không đủ.`,
        loai: 'Đơn hàng',
        maDH: rejectedOrder.MADH,
        maGT: rejectedOrder.MAGT,
        duongDan: `/orders/${rejectedOrder.MADH}`
    })
}


async function getNotifications(nguoiNhan) {
    const request = new sql.Request()

    request.input('NGUOINHAN', sql.Int, nguoiNhan)

    const result = await request.query(`
        SELECT MATB, TIEUDE, NOIDUNG, LOAI, MADH, MAGT, MACUOC,
                MATN, MADG, DUONGDAN, DADOC, THOIGIAN, THOIGIANDOC
        FROM THONGBAO
        WHERE NGUOINHAN = @NGUOINHAN
        ORDER BY THOIGIAN DESC`)

    return result.recordset
}



async function getNotificationById(maTB) {
    const request = new sql.Request()

    request.input('MATB', sql.BigInt, maTB)

    const result = await request.query(`
        SELECT MATB, NGUOINHAN, DADOC
        FROM THONGBAO
        WHERE MATB = @MATB`)

    if (result.recordset.length === 0){
        const error = new Error('Không tìm thấy thông báo!')
        error.status = 404
        throw error
    }
    return result.recordset[0]
}


async function markNotificationAsRead(maTB, nguoiNhan) {
    const notification = await getNotificationById(maTB)

    if (notification.NGUOINHAN !== nguoiNhan){
        const error = new Error('Bạn không có quyền thao tác thông báo này!')
        error.status = 403
        throw error
    }

    if (notification.DADOC){
        return
    }

    const request = new sql.Request()

    request.input('MATB', sql.BigInt, maTB)
    request.input('NGUOINHAN', sql.Int, nguoiNhan) 

    await request.query(`
        UPDATE THONGBAO
        SET DADOC = 1,
        THOIGIANDOC = SYSDATETIME()
        WHERE MATB = @MATB
            AND NGUOINHAN = @NGUOINHAN
            AND DADOC = 0`)
}



async function markAllNotificationsAsRead(nguoiNhan) {
    const request = new sql.Request()

    request.input('NGUOINHAN', sql.Int, nguoiNhan)

    await request.query(`
        UPDATE THONGBAO
        SET DADOC = 1,
        THOIGIANDOC = SYSDATETIME()
        WHERE NGUOINHAN = @NGUOINHAN
            AND DADOC = 0`)
}



async function getUnreadNotificationCount(nguoiNhan) {
    const request = new sql.Request()

    request.input('NGUOINHAN', sql.Int, nguoiNhan)

    const result = await request.query(`
        SELECT SOLUONGCHUADOC
        FROM V_THONGBAO_CHUADOC
        WHERE NGUOINHAN = @NGUOINHAN`)

    if (result.recordset.length === 0){
        return 0
    }

    return Number(result.recordset[0].SOLUONGCHUADOC)
}


async function createReviewNotification(transaction, review, order){
    return insertNotification(transaction,{
        nguoiNhan: order.NGUOIBAN,
        tieuDe: 'Bạn nhận được đánh giá mới',
        noiDung: `Bạn vừa nhận được đánh giá ${review.SOSAO} sao.`,
        loai: 'Đánh giá',
        maDH: review.MADH,
        maDG: review.MADG
    })
}


async function createOrderManuallyRejectedNotification(transaction, order) {
    return insertNotification(transaction, {
        nguoiNhan: order.NGUOIMUA,
        tieuDe: 'Yêu cầu giao dịch đã bị từ chối',
        noiDung:
            `Người bán đã từ chối yêu cầu giao dịch ` +
            `giáo trình "${order.TENGT}".`,
        loai: 'Đơn hàng',
        maDH: order.MADH,
        maGT: order.MAGT,
        duongDan: `/orders/${order.MADH}`})
}


async function createOrderCancelledNotification(transaction, order, nguoiHuy) {
    const nguoiNhan = nguoiHuy === order.NGUOIMUA ? order.NGUOIBAN : order.NGUOIMUA
    const vaiTroNguoiHuy = nguoiHuy === order.NGUOIMUA ? 'Người mua' : 'Người bán'

    return insertNotification(transaction, {
        nguoiNhan,
        tieuDe: 'Giao dịch đã bị hủy',
        noiDung:
            `${vaiTroNguoiHuy} đã hủy giao dịch ` +
            `giáo trình "${order.TENGT}".`,
        loai: 'Đơn hàng',
        maDH: order.MADH,
        maGT: order.MAGT,
        duongDan: `/orders/${order.MADH}`
    })
}


async function createOrderDeliveredNotification(transaction, order) {
    return insertNotification(transaction, {
        nguoiNhan: order.NGUOIMUA,
        tieuDe: 'Người bán đã giao giáo trình',
        noiDung:
            `Người bán đã xác nhận giao giáo trình "${order.TENGT}". ` +
            `Vui lòng xác nhận đã nhận hoặc báo có vấn đề trong vòng 72 giờ.`,
        loai: 'Đơn hàng',
        maDH: order.MADH,
        maGT: order.MAGT,
        duongDan: `/orders/${order.MADH}`
    })
}


async function createOrderCompletedNotification(transaction, order) {
    return insertNotification(transaction, {
        nguoiNhan: order.NGUOIBAN,
        tieuDe: 'Giao dịch đã hoàn tất',
        noiDung:
            `Người mua đã xác nhận nhận giáo trình ` +
            `"${order.TENGT}". Giao dịch đã hoàn tất.`,
        loai: 'Đơn hàng',
        maDH: order.MADH,
        maGT: order.MAGT,
        duongDan: `/orders/${order.MADH}`
    })
}



async function createOrderIssueNotification(transaction, order, report) {
    return insertNotification(transaction, {
        nguoiNhan: order.NGUOIBAN,
        tieuDe: 'Người mua báo có vấn đề',
        noiDung:
            `Người mua đã báo có vấn đề với giao dịch giáo trình ` +
            `"${order.TENGT}". Loại báo cáo: ${report.LOAIBAOCAO}.`,
        loai: 'Báo cáo',
        maDH: order.MADH,
        maGT: order.MAGT,
        duongDan: `/orders/${order.MADH}`
    })
}


async function createReportResolvedNotifications(transaction, report, resolution) {
    const duongDan = report.MADH ? `/orders/${report.MADH}` : null

    const reporterNotification =
        await insertNotification(transaction, {
            nguoiNhan: report.NGUOIBAOCAO,
            tieuDe: 'Báo cáo đã được xử lý',
            noiDung:
                `Báo cáo của bạn đã được kết luận: ` +
                `${resolution.ketLuan}.`,
            loai: 'Báo cáo',
            maDH: report.MADH,
            maTN: report.MATN,
            duongDan
        })

    const reportedNotification =
        await insertNotification(transaction, {
            nguoiNhan: report.NGUOIBIBAOCAO,
            tieuDe: 'Báo cáo liên quan đã được xử lý',
            noiDung:
                `Báo cáo liên quan đến tài khoản của bạn ` +
                `đã được kết luận: ${resolution.ketLuan}.`,
            loai: 'Báo cáo',
            maDH: report.MADH,
            maTN: report.MATN,
            duongDan
        })

    return [
        reporterNotification,
        reportedNotification
    ]
}


module.exports = {
    insertNotification,
    createOrderNotification,
    createOrderConfirmedNotification,
    createOrderRejectedNotification,
    getNotifications,
    getNotificationById,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getUnreadNotificationCount,
    createReviewNotification,
    createOrderManuallyRejectedNotification,
    createOrderCancelledNotification,
    createOrderDeliveredNotification,
    createOrderCompletedNotification,
    createOrderIssueNotification,
    createReportResolvedNotifications
}