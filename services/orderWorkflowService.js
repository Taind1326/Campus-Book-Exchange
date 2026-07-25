const {sql} = require('../config/db')
const {getIO} = require('../config/socket')

const {
    validateOrder: validateOrderService,
    checkExistingActiveOrder: checkExistingActiveOrderService,
    getTransactionType: getTransactionTypeService,
    getTextbookForOrderWithLock: getTextbookForOrderWithLockService,
    insertOrder: insertOrderService,
    insertOrderDetail: insertOrderDetailService,
    getOrderForConfirmationWithLock: getOrderForConfirmationWithLockService,
    validateOrderConfirmation: validateOrderConfirmationService,
    confirmOrderAndHoldQuantity: confirmOrderAndHoldQuantityService,
    rejectOrdersExceedingAvailableQuantity: rejectOrdersExceedingAvailableQuantityService,
    getOrdersByUser: getOrdersByUserService,
    getOrderDetail: getOrderDetailService,
    validateOrderRejection: validateOrderRejectionService,
    rejectOrder: rejectOrderService,
    validateOrderCancellation: validateOrderCancellationService,
    cancelOrderAndReleaseQuantity: cancelOrderAndReleaseQuantityService,
    validateOrderDelivery: validateOrderDeliveryService,
    markOrderAsDelivered: markOrderAsDeliveredService
} = require('./orderService')

const {
    createOrGetConversationForOrder: createOrGetConversationForOrderService
} = require('./conversationService')

const {
    createOrderNotification: createOrderNotificationService,
    createOrderConfirmedNotification: createOrderConfirmedNotificationService,
    createOrderRejectedNotification: createOrderRejectedNotificationService,
    createOrderManuallyRejectedNotification: createOrderManuallyRejectedNotificationService,
    createOrderCancelledNotification: createOrderCancelledNotificationService,
    createOrderDeliveredNotification: createOrderDeliveredNotificationService
} = require('./notificationService')

async function createOrder(data, nguoiMua) {
    const transaction = new sql.Transaction()
    let transactionStarted = false

    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE)
        transactionStarted = true

        const textbook = await getTextbookForOrderWithLockService(transaction, data.maGT)

        validateOrderService(textbook, nguoiMua, data.soLuong)

        await checkExistingActiveOrderService(transaction, data.maGT, nguoiMua)

        const maDH = await insertOrderService(transaction, textbook, nguoiMua)

        await insertOrderDetailService(transaction, maDH, textbook, data.soLuong)

        const maCuoc = await createOrGetConversationForOrderService(transaction, textbook.MAGT, maDH, nguoiMua, textbook.NGUOIDANG)

        const notification = await createOrderNotificationService(transaction, textbook, maDH, maCuoc)

        await transaction.commit()
        transactionStarted = false

        try {
            const io = getIO()

            io.to(`user:${notification.NGUOINHAN}`).emit('notification:new', notification)
        }

        catch(socketError){
            console.error( 'Lỗi gửi thông báo realtime tạo đơn hàng:', socketError)
        }

        return {
            maDH,
            maCuoc,
            maGT: textbook.MAGT,
            tenGT: textbook.TENGT,
            nguoiBan: textbook.NGUOIDANG,
            loaiGiaoDich: getTransactionTypeService(textbook.LOAI),
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

async function confirmOrder(maDH, nguoiBan) {
    const transaction = new sql.Transaction()
    let transactionStarted = false

    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE)

        transactionStarted = true

        const order = await getOrderForConfirmationWithLockService(transaction, maDH)

        validateOrderConfirmationService(order, nguoiBan)

        await confirmOrderAndHoldQuantityService(transaction, order)

        const rejectedOrders = await rejectOrdersExceedingAvailableQuantityService(transaction, order)
        const confirmedNotification = await createOrderConfirmedNotificationService(transaction, order)
        const rejectedNotifications = []

        for (const rejectedOrder of rejectedOrders) {
            const notification = await createOrderRejectedNotificationService(transaction, rejectedOrder, order.TENGT)

            rejectedNotifications.push(notification)
        }

        await transaction.commit()
        transactionStarted = false

        try {
            const io = getIO()

            io.to(`user:${confirmedNotification.NGUOINHAN}`).emit('notification:new', confirmedNotification)

            for (const notification of rejectedNotifications) {
                io.to(`user:${notification.NGUOINHAN}`).emit('notification:new', notification)
            }
        }

        catch (socketError) {
            console.error('Lỗi gửi realtime xác nhận đơn:', socketError)
        }

        const soLuongConLai = order.TONGSOLUONG - (order.SOLUONGDANGGIU ?? 0) - order.SOLUONG

        return {
            maDH: order.MADH,
            maGT: order.MAGT,
            tenGT: order.TENGT,
            nguoiMua: order.NGUOIMUA,
            soLuong: order.SOLUONG,
            trangThai: 'Đã chốt',
            soLuongConLai,
            soDonBiTuChoi: rejectedOrders.length
        }
    }

    catch (error) {
        if (transactionStarted) {
            try {
                await transaction.rollback()
            }

            catch (rollbackError) {
                console.log('Lỗi rollback xác nhận đơn:', rollbackError)
            }
        }

        throw error
    }
}


async function getBuyingOrders(nguoiMua, page, limit) {
    return getOrdersByUserService(nguoiMua, 'buying', page, limit)
}


async function getSellingOrders(nguoiBan, page, limit) {
    return getOrdersByUserService(nguoiBan, 'selling', page, limit)
}


async function getOrderDetail(maDH, nguoiDung) {
    return getOrderDetailService(maDH, nguoiDung)
}


async function rejectOrder(maDH, nguoiBan) {
    const transaction = new sql.Transaction()
    let transactionStarted = false

    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE)

        transactionStarted = true

        const order = await getOrderForConfirmationWithLockService(transaction, maDH)

        validateOrderRejectionService(order, nguoiBan)

        await rejectOrderService(transaction, order.MADH)

        const notification = await createOrderManuallyRejectedNotificationService(transaction, order)

        await transaction.commit()
        transactionStarted = false

        try {
            const io = getIO()

            io.to(`user:${notification.NGUOINHAN}`).emit('notification:new', notification)
        }

        catch (socketError) {
            console.error('Lỗi gửi realtime từ chối đơn:', socketError)
        }

        return {
            maDH: order.MADH,
            maGT: order.MAGT,
            tenGT: order.TENGT,
            nguoiMua: order.NGUOIMUA,
            trangThai: 'Bị từ chối'
        }
    }

    catch (error) {
        if (transactionStarted) {
            try {
                await transaction.rollback()
            }

            catch (rollbackError) {
                console.log('Lỗi rollback từ chối đơn:', rollbackError)
            }
        }

        throw error
    }
}


async function cancelOrder(maDH, nguoiDung) {
    const transaction = new sql.Transaction()
    let transactionStarted = false

    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE)

        transactionStarted = true

        const order = await getOrderForConfirmationWithLockService(transaction, maDH)

        validateOrderCancellationService(order, nguoiDung)

        await cancelOrderAndReleaseQuantityService(transaction, order)

        const notification = await createOrderCancelledNotificationService(transaction, order, nguoiDung)

        await transaction.commit()
        transactionStarted = false

        try {
            const io = getIO()

            io.to(`user:${notification.NGUOINHAN}`).emit('notification:new', notification)
        }

        catch (socketError) {
            console.error('Lỗi gửi realtime hủy đơn:', socketError)
        }

        return {
            maDH: order.MADH,
            maGT: order.MAGT,
            tenGT: order.TENGT,
            trangThaiCu: order.TRANGTHAI,
            trangThai: 'Đã hủy',
            soLuongDuocTra: order.TRANGTHAI === 'Đang trao đổi' ? 0 : order.SOLUONG
        }
    }

    catch (error) {
        if (transactionStarted) {
            try {
                await transaction.rollback()
            }

            catch (rollbackError) {
                console.log('Lỗi rollback hủy đơn:', rollbackError)
            }
        }

        throw error
    }
}



async function markOrderDelivered(maDH, nguoiBan) {
    const transaction = new sql.Transaction()
    let transactionStarted = false

    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE)
        transactionStarted = true

        const order = await getOrderForConfirmationWithLockService(transaction, maDH)

        validateOrderDeliveryService(order, nguoiBan)

        const deliveryTime = await markOrderAsDeliveredService(transaction, order.MADH)
        const notification = await createOrderDeliveredNotificationService(transaction, order)

        await transaction.commit()
        transactionStarted = false

        try {
            const io = getIO()

            io.to(`user:${notification.NGUOINHAN}`).emit('notification:new', notification)
        }

        catch (socketError) {
            console.error('Lỗi gửi realtime xác nhận đã giao:', socketError)
        }

        return {
            maDH: order.MADH,
            maGT: order.MAGT,
            tenGT: order.TENGT,
            nguoiMua: order.NGUOIMUA,
            trangThai: 'Chờ xác nhận',
            ngayNguoiBanXacNhan:
                deliveryTime.NGAYNGUOIBANXACNHAN,
            hanXacNhan:
                deliveryTime.HANXACNHAN
        }
    }

    catch (error) {
        if (transactionStarted) {
            try {
                await transaction.rollback()
            }

            catch (rollbackError) {
                console.log('Lỗi rollback xác nhận đã giao:', rollbackError)
            }
        }

        throw error
    }
}


module.exports = {
    createOrder, 
    confirmOrder, 
    getBuyingOrders, 
    getSellingOrders,
    getOrderDetail,
    rejectOrder,
    cancelOrder,
    markOrderDelivered
}