const {sql} = require('../config/db')

const {
    validateOrder,
    checkExistingActiveOrder,
    getTransactionType,
    getTextbookForOrderWithLock,
    insertOrder,
    insertOrderDetail
} = require('./orderService')

const {createOrGetConversationForOrder} = require('./conversationService')

async function createOrder(data, nguoiMua) {
    const transaction = new sql.Transaction()
    let transactionStarted = false

    try {
        await transaction.begin()
        transactionStarted = true

        const textbook = await getTextbookForOrderWithLock(transaction, data.maGT)

        validateOrder(textbook, nguoiMua, data.soLuong)

        await checkExistingActiveOrder(transaction, data.maGT, nguoiMua)

        const maDH = await insertOrder(transaction, textbook, nguoiMua)

        await insertOrderDetail(transaction, maDH, textbook, data.soLuong)

        const maCuoc = await createOrGetConversationForOrder(transaction, textbook.MAGT, maDH, nguoiMua, textbook.NGUOIDANG)

        await transaction.commit()
        transactionStarted = false

        return {
            maDH,
            maCuoc,
            maGT: textbook.MAGT,
            tenGT: textbook.TENGT,
            nguoiBan: textbook.NGUOIDANG,
            loaiGiaoDich: getTransactionType(textbook.LOAI),
            soLuong: data.soLuong,
            donGia: textbook.DONGIA,
            trangThai: 'Đang trao đổi'
        }
    }

    catch(error){
        if (transactionStarted){
            try {
                await transaction.rollback()
            }

            catch(rollbackError){
                console.log('Lỗi rollback tạo đơn hàng: ', rollbackError)
            }
        }
        throw error
    }
}


module.exports = {createOrder}