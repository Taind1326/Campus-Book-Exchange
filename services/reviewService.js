const {sql} = require('../config/db')


async function getOrderForReview(transaction, maDH) {
    const request = new sql.Request(transaction)

    request.input('MADH', sql.Int, maDH)

    const result = await request.query(`
        SELECT
            MADH,
            NGUOIMUA,
            NGUOIBAN,
            TRANGTHAI
        FROM DONHANG WITH (UPDLOCK, HOLDLOCK)
        WHERE MADH = @MADH
    `)

    return result.recordset[0] || null
}


function validateReviewOrder(order, nguoiDanhGia) {
    if (!order) {
        const error = new Error('Đơn hàng không tồn tại')
        error.status = 404
        throw error
    }

    if (order.TRANGTHAI !== 'Hoàn thành') {
        const error = new Error(
            'Chỉ có thể đánh giá sau khi giao dịch hoàn thành'
        )
        error.status = 400
        throw error
    }

    if (order.NGUOIMUA !== nguoiDanhGia) {
        const error = new Error(
            'Chỉ người mua mới được đánh giá người bán'
        )
        error.status = 403
        throw error
    }
}


async function checkExistingReview(
    transaction,
    maDH,
    nguoiDanhGia
) {
    const request = new sql.Request(transaction)

    request.input('MADH', sql.Int, maDH)
    request.input('NGUOIDANHGIA', sql.Int, nguoiDanhGia)

    const result = await request.query(`
        SELECT MADG
        FROM DANHGIA WITH (UPDLOCK, HOLDLOCK)
        WHERE MADH = @MADH
          AND NGUOIDANHGIA = @NGUOIDANHGIA
    `)

    if (result.recordset.length > 0) {
        const error = new Error(
            'Bạn đã đánh giá giao dịch này rồi'
        )
        error.status = 409
        throw error
    }
}


async function insertReview(
    transaction,
    data,
    nguoiDanhGia,
    nguoiBan
) {
    const request = new sql.Request(transaction)

    request.input('MADH', sql.Int, data.maDH)
    request.input('NGUOIDANHGIA', sql.Int, nguoiDanhGia)
    request.input('NGUOIDUOCDANHGIA', sql.Int, nguoiBan)
    request.input('SOSAO', sql.Int, data.soSao)

    request.input(
        'BINHLUAN',
        sql.NVarChar(sql.MAX),
        data.binhLuan || null
    )

    const result = await request.query(`
        INSERT INTO DANHGIA
        (
            MADH,
            NGUOIDANHGIA,
            NGUOIDUOCDANHGIA,
            SOSAO,
            BINHLUAN
        )
        OUTPUT
            INSERTED.MADG,
            INSERTED.MADH,
            INSERTED.NGUOIDANHGIA,
            INSERTED.NGUOIDUOCDANHGIA,
            INSERTED.SOSAO,
            INSERTED.BINHLUAN,
            INSERTED.NGAYDANHGIA
        VALUES
        (
            @MADH,
            @NGUOIDANHGIA,
            @NGUOIDUOCDANHGIA,
            @SOSAO,
            @BINHLUAN
        )
    `)

    return result.recordset[0]
}


async function getReviewsBySeller(maTK) {
    const request = new sql.Request()

    request.input('MATK', sql.Int, maTK)

    const result = await request.query(`
        SELECT
            DG.MADG,
            DG.MADH,
            DG.NGUOIDANHGIA,
            TK.TENTK AS NGUOIDANHGIATEN,
            DG.NGUOIDUOCDANHGIA,
            DG.SOSAO,
            DG.BINHLUAN,
            DG.NGAYDANHGIA
        FROM DANHGIA DG
        JOIN TAIKHOAN TK
            ON TK.MATK = DG.NGUOIDANHGIA
        WHERE DG.NGUOIDUOCDANHGIA = @MATK
        ORDER BY DG.NGAYDANHGIA DESC
    `)

    return result.recordset
}


async function getSellerReviewStatistics(maTK) {
    const request = new sql.Request()

    request.input('MATK', sql.Int, maTK)

    const result = await request.query(`
        SELECT
            MATK,
            TENTK,
            DIEMTRUNGBINH,
            SOLUOTDANHGIA,
            SOLUOT1SAO
        FROM V_UYTIN_TAIKHOAN
        WHERE MATK = @MATK
    `)

    return result.recordset[0] || null
}


module.exports = {
    getOrderForReview,
    validateReviewOrder,
    checkExistingReview,
    insertReview,
    getReviewsBySeller,
    getSellerReviewStatistics
}