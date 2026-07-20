const {sql} = require('../config/db')

async function getOrderForReport(transaction, maDH) {
    const request = new sql.Request(transaction)

    request.input('MADH', sql.Int, maDH)

        const result = await request.query(`
            SELECT MADH, NGUOIMUA, NGUOIBAN, TRANGTHAI
            FROM DONHANG WITH (UPDLOCK, HOLDLOCK)
            WHERE MADH = @MADH`)

    return result.recordset[0] || null

}


async function checkExistingReport(transaction, maDH, nguoiBaoCao) {
    const request = new sql.Request(transaction)

    request.input('MADH', sql.Int, maDH)
    request.input('NGUOIBAOCAO', sql.Int, nguoiBaoCao)

    const result = await request.query(`
        SELECT MABC
        FROM BAOCAO WITH (UPDLOCK, HOLDLOCK)
        WHERE MADH = @MADH
            AND NGUOIBAOCAO = @NGUOIBAOCAO`)

    if (result.recordset.length > 0){
        const error = new Error('Bạn đã báo cáo giao dịch này rồi')
        error.status = 409
        throw error
    }
}


async function insertReport(transaction, nguoiBaoCao, nguoiBiBaoCao, data) {
    const request = new sql.Request(transaction)

    request.input('NGUOIBAOCAO', sql.Int, nguoiBaoCao)
    request.input('NGUOIBIBAOCAO', sql.Int, nguoiBiBaoCao)
    request.input('MADH', sql.Int, data.maDH)
    request.input('MATN', sql.Int, data.maTN || null)
    request.input('LOAIBAOCAO', sql.NVarChar(50), data.loaiBaoCao)
    request.input('NOIDUNG', sql.NVarChar(sql.MAX), data.noiDung)
    request.input('MINHCHUNG', sql.NVarChar(sql.MAX), data.minhChung || null)

    const result = await request.query(`
        INSERT INTO BAOCAO (NGUOIBAOCAO, NGUOIBIBAOCAO, MADH, MATN, LOAIBAOCAO, NOIDUNG, MINHCHUNG)
        OUTPUT INSERTED.MABC, INSERTED.NGUOIBAOCAO, INSERTED.NGUOIBIBAOCAO, INSERTED.MADH,
                INSERTED.MATN, INSERTED.LOAIBAOCAO, INSERTED.NOIDUNG, INSERTED.MINHCHUNG,
                INSERTED.TRANGTHAI, INSERTED.NGAYBAOCAO
        VALUES (@NGUOIBAOCAO, @NGUOIBIBAOCAO, @MADH, @MATN, @LOAIBAOCAO, @NOIDUNG, @MINHCHUNG)`)

    return result.recordset[0]
}



function validateReportOrder(order, nguoiBaoCao) {
    if (!order){
        const error = new Error('Đơn hàng không tồn tại!')
        error.status = 404
        throw error
    }

    const laNguoiMua = order.NGUOIMUA === nguoiBaoCao
    const laNguoiBan = order.NGUOIBAN === nguoiBaoCao

    if (!laNguoiBan && !laNguoiMua){
        const error = new Error('Bạn không có quyền báo cáo giao dịch này!')
        error.status = 403
        throw error 
    }

    return laNguoiMua ? order.NGUOIBAN : order.NGUOIMUA

}


module.exports = {getOrderForReport, validateReportOrder, checkExistingReport, insertReport}