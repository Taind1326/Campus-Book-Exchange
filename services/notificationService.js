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
        OUTPUT INSERTED.MATB
        VALUES (@NGUOINHAN, @TIEUDE, @NOIDUNG, @LOAI, @MADH, @MAGT, @MACUOC, @MATN, @MADG, @DUONGDAN)`)

    return result.recordset[0].MATB
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

    await request.query(`
        UPDATE THONGBAO
        SET DADOC = 1,
        THOIGIANDOC = SYSDATETIME()
        WHERE MATB = @MATB`)
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


module.exports = {
    insertNotification,
     createOrderNotification, 
     getNotifications,
     getNotificationById,
     markNotificationAsRead,
     markAllNotificationsAsRead
}