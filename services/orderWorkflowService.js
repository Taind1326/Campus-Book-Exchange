const {sql} = require('../config/db')

const {
    dispatchNotification,
    dispatchNotifications
} = require(
    './notificationDispatchService'
)

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
    markOrderAsDelivered: markOrderAsDeliveredService,
    validateOrderReceipt: validateOrderReceiptService,
    completeOrderAndDeductQuantity: completeOrderAndDeductQuantityService,
    validateOrderIssue: validateOrderIssueService,
    markOrderAsDisputed: markOrderAsDisputedService,
    getExpiredOrderIds: getExpiredOrderIdsService,
    validateExpiredOrderCompletion: validateExpiredOrderCompletionService,
    getPendingSellingOrderCount: getPendingSellingOrderCountService,
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
    createOrderDeliveredNotification: createOrderDeliveredNotificationService,
    createOrderCompletedNotification: createOrderCompletedNotificationService,
    createOrderIssueNotification: createOrderIssueNotificationService,
    createOrderAutoCompletedNotifications: createOrderAutoCompletedNotificationsService
} = require('./notificationService')

const {
    checkExistingReport: checkExistingReportService,
    insertReport: insertReportService
} = require('./reportService')


const {
    validateExchangeInput: validateExchangeInputService,
    getExchangeTextbookWithLock: getExchangeTextbookWithLockService,
    validateExchangeTextbook: validateExchangeTextbookService,
    insertExchangeProposal: insertExchangeProposalService,
    getExchangeProposalForOrderWithLock: getExchangeProposalForOrderWithLockService,
    getExchangeTextbooksForConfirmationWithLock: getExchangeTextbooksForConfirmationWithLockService,
    validateExchangeConfirmation: validateExchangeConfirmationService,
    holdExchangeTextbookQuantity: holdExchangeTextbookQuantityService,
    releaseExchangeTextbookQuantity: releaseExchangeTextbookQuantityService,
    completeExchangeTextbookAndDeductQuantity: completeExchangeTextbookAndDeductQuantityService
} = require('./exchangeService')


async function createOrder(data, nguoiMua) {
    const transaction = new sql.Transaction()
    let transactionStarted = false

    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE)

        transactionStarted = true

        const textbook = await getTextbookForOrderWithLockService(transaction, data.maGT)

        validateOrderService(textbook, nguoiMua, data.soLuong)

        validateExchangeInputService(textbook, data)

        let exchangeTextbook = null
        let exchangeProposal = null

        if (textbook.LOAI === 'Trao đổi') {
            exchangeTextbook = await getExchangeTextbookWithLockService(transaction, data.maGTMangDoi)

            validateExchangeTextbookService(textbook, exchangeTextbook, nguoiMua, data)
        }

        await checkExistingActiveOrderService(transaction, data.maGT, nguoiMua)

        const maDH = await insertOrderService(transaction, textbook, nguoiMua)

        await insertOrderDetailService(transaction, maDH, textbook, data.soLuong)

        if (textbook.LOAI === 'Trao đổi') {
            exchangeProposal = await insertExchangeProposalService(transaction, maDH, textbook, data)
        }

        const maCuoc = await createOrGetConversationForOrderService(transaction,textbook.MAGT, maDH, nguoiMua, textbook.NGUOIDANG)
        const notification = await createOrderNotificationService(transaction, textbook, maDH, maCuoc)

        await transaction.commit()
        transactionStarted = false

        await dispatchNotification(
            notification
        )

        const result = {
            maDH,
            maCuoc,
            maGT: textbook.MAGT,
            tenGT: textbook.TENGT,
            nguoiBan: textbook.NGUOIDANG,
            loaiGiaoDich:
                getTransactionTypeService(textbook.LOAI),
            soLuong: data.soLuong,
            donGia: textbook.DONGIA,
            trangThai: 'Đang trao đổi'
        }

        if (exchangeProposal) {
            result.traoDoi = {
                maGTDuocDoi: exchangeProposal.MAGTDUOCDOI,
                maGTMangDoi: exchangeProposal.MAGTMANGDOI,
                tenGTMangDoi: exchangeTextbook.TENGT,
                soLuongMangDoi: exchangeProposal.SOLUONGMANGDOI
            }
        }

        return result
    }

    catch (error) {
        if (transactionStarted) {
            try {
                await transaction.rollback()
            }

            catch (rollbackError) {
                console.log('Lỗi rollback tạo đơn hàng:', rollbackError)
            }
        }

        throw error
    }
}


async function confirmOrder(
    maDH,
    nguoiBan
) {
    const transaction =
        new sql.Transaction()

    let transactionStarted = false


    try {
        await transaction.begin(
            sql.ISOLATION_LEVEL.SERIALIZABLE
        )

        transactionStarted = true


        const exchangeProposal =
            await getExchangeProposalForOrderWithLockService(
                transaction,
                maDH
            )

        let exchangeTextbooks = null


        if (exchangeProposal) {
            exchangeTextbooks =
                await getExchangeTextbooksForConfirmationWithLockService(
                    transaction,
                    exchangeProposal
                )
        }


        const order =
            await getOrderForConfirmationWithLockService(
                transaction,
                maDH
            )


        validateOrderConfirmationService(
            order,
            nguoiBan
        )


        if (exchangeProposal) {
            validateExchangeConfirmationService(
                order,
                exchangeProposal,
                exchangeTextbooks
            )

            await holdExchangeTextbookQuantityService(
                transaction,
                exchangeProposal
            )
        }


        await confirmOrderAndHoldQuantityService(
            transaction,
            order
        )


        const rejectedOrders =
            await rejectOrdersExceedingAvailableQuantityService(
                transaction,
                order
            )

        const confirmedNotification =
            await createOrderConfirmedNotificationService(
                transaction,
                order
            )

        const rejectedNotifications = []


        for (
            const rejectedOrder
            of rejectedOrders
        ) {
            const notification =
                await createOrderRejectedNotificationService(
                    transaction,
                    rejectedOrder,
                    order.TENGT
                )

            rejectedNotifications.push(
                notification
            )
        }


        await transaction.commit()
        transactionStarted = false


        await dispatchNotifications([
            confirmedNotification,
            ...rejectedNotifications
        ])


        const soLuongConLai =
            order.TONGSOLUONG -
            (order.SOLUONGDANGGIU ?? 0) -
            order.SOLUONG

        const result = {
            maDH: order.MADH,
            maGT: order.MAGT,
            tenGT: order.TENGT,
            nguoiMua: order.NGUOIMUA,
            soLuong: order.SOLUONG,
            trangThai: 'Đã chốt',
            soLuongConLai,
            soDonBiTuChoi:
                rejectedOrders.length
        }


        if (
            exchangeProposal &&
            exchangeTextbooks
        ) {
            const exchangeTextbook =
                exchangeTextbooks
                    .exchangeTextbook

            const soLuongMangDoiConLai =
                exchangeTextbook.SOLUONG -
                (
                    exchangeTextbook
                        .SOLUONGDANGGIU ?? 0
                ) -
                exchangeProposal
                    .SOLUONGMANGDOI


            result.traoDoi = {
                maGTDuocDoi:
                    exchangeProposal
                        .MAGTDUOCDOI,

                maGTMangDoi:
                    exchangeProposal
                        .MAGTMANGDOI,

                tenGTMangDoi:
                    exchangeTextbook.TENGT,

                soLuongMangDoi:
                    exchangeProposal
                        .SOLUONGMANGDOI,

                soLuongMangDoiConLai
            }
        }


        return result
    }

    catch (error) {
        if (transactionStarted) {
            try {
                await transaction.rollback()
            }

            catch (rollbackError) {
                console.log(
                    'Lỗi rollback xác nhận đơn:',
                    rollbackError
                )
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


async function getPendingSellingOrderCount(
    nguoiBan
) {
    return getPendingSellingOrderCountService(
        nguoiBan
    )
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

        await dispatchNotification(notification)

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

        const exchangeProposal = await getExchangeProposalForOrderWithLockService(transaction, maDH)

        let exchangeTextbooks = null

        if (exchangeProposal) {
            exchangeTextbooks = await getExchangeTextbooksForConfirmationWithLockService(transaction, exchangeProposal)
        }

        const order = await getOrderForConfirmationWithLockService(transaction, maDH)

        validateOrderCancellationService(order, nguoiDung)

        let soLuongMangDoiDuocTra = 0

        if (exchangeProposal) {
            soLuongMangDoiDuocTra = await releaseExchangeTextbookQuantityService(transaction, exchangeProposal, order.TRANGTHAI)
        }

        await cancelOrderAndReleaseQuantityService(transaction, order)

        const notification = await createOrderCancelledNotificationService(transaction, order, nguoiDung)

        await transaction.commit()
        transactionStarted = false

        await dispatchNotification(notification)

        const result = {
            maDH: order.MADH,
            maGT: order.MAGT,
            tenGT: order.TENGT,
            trangThaiCu: order.TRANGTHAI,
            trangThai: 'Đã hủy',

            soLuongDuocTra:
                order.TRANGTHAI === 'Đang trao đổi'
                    ? 0
                    : order.SOLUONG
        }

        if (exchangeProposal && exchangeTextbooks) {
            const exchangeTextbook = exchangeTextbooks.exchangeTextbook
            result.traoDoi = {
                maGTMangDoi: exchangeProposal.MAGTMANGDOI,
                tenGTMangDoi: exchangeTextbook.TENGT,
                soLuongMangDoiDuocTra
            }
        }

        return result
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

        await dispatchNotification(notification)

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


async function confirmOrderReceived(maDH, nguoiMua) {
    const transaction = new sql.Transaction()
    let transactionStarted = false

    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE)

        transactionStarted = true

        const exchangeProposal = await getExchangeProposalForOrderWithLockService(transaction, maDH)

        let exchangeTextbooks = null

        if (exchangeProposal) {
            exchangeTextbooks = await getExchangeTextbooksForConfirmationWithLockService(transaction, exchangeProposal)
        }

        const order = await getOrderForConfirmationWithLockService(transaction, maDH)

        validateOrderReceiptService(order, nguoiMua)

        let completedExchangeTextbook = null

        if (exchangeProposal) {
            completedExchangeTextbook = await completeExchangeTextbookAndDeductQuantityService(transaction, exchangeProposal)
        }


        const completion = await completeOrderAndDeductQuantityService(transaction, order)
        const notification = await createOrderCompletedNotificationService(transaction, order)

        await transaction.commit()
        transactionStarted = false

        await dispatchNotification(notification)

        const result = {
            maDH: order.MADH,
            maGT: order.MAGT,
            tenGT: order.TENGT,
            nguoiBan: order.NGUOIBAN,
            soLuong: order.SOLUONG,
            trangThai: 'Hoàn tất',
            ngayHoanThanh: completion.NGAYHOANTHANH,
            soLuongConLai: order.TONGSOLUONG - order.SOLUONG
        }

        if (exchangeProposal && exchangeTextbooks && completedExchangeTextbook) {
            result.traoDoi = {
                maGTMangDoi: exchangeProposal.MAGTMANGDOI,
                tenGTMangDoi: exchangeTextbooks.exchangeTextbook.TENGT,
                soLuongMangDoi: exchangeProposal.SOLUONGMANGDOI,
                soLuongMangDoiConLai: completedExchangeTextbook.SOLUONG
            }
        }

        return result
    }

    catch (error) {
        if (transactionStarted) {
            try {
                await transaction.rollback()
            }

            catch (rollbackError) {
                console.log('Lỗi rollback xác nhận đã nhận:', rollbackError)
            }
        }

        throw error
    }
}



async function reportOrderIssue(data, nguoiMua) {
    const transaction = new sql.Transaction()
    let transactionStarted = false

    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE)
        transactionStarted = true

        const order = await getOrderForConfirmationWithLockService(transaction, data.maDH)

        validateOrderIssueService(order, nguoiMua)

        await checkExistingReportService(transaction, order.MADH, nguoiMua)

        const report = await insertReportService(
            transaction,
            nguoiMua,
            order.NGUOIBAN,
            {
                maDH: order.MADH,
                loaiBaoCao: data.loaiBaoCao,
                noiDung: data.noiDung,
                minhChung: data.minhChung
            }
        )

        await markOrderAsDisputedService(transaction, order.MADH)

        const notification =  await createOrderIssueNotificationService(transaction, order, report)

        await transaction.commit()
        transactionStarted = false

        await dispatchNotification(notification)

        return {
            maDH: order.MADH,
            maGT: order.MAGT,
            tenGT: order.TENGT,
            nguoiBan: order.NGUOIBAN,
            trangThai: 'Tranh chấp',
            baoCao: {
                maBC: report.MABC,
                loaiBaoCao: report.LOAIBAOCAO,
                noiDung: report.NOIDUNG,
                minhChung: report.MINHCHUNG,
                trangThai: report.TRANGTHAI,
                ngayBaoCao: report.NGAYBAOCAO
            }
        }
    }

    catch (error) {
        if (transactionStarted) {
            try {
                await transaction.rollback()
            }

            catch (rollbackError) {
                console.log('Lỗi rollback báo có vấn đề:', rollbackError)
            }
        }

        throw error
    }
}



async function autoCompleteExpiredOrders(limit = 50) {
    const expiredOrderIds = await getExpiredOrderIdsService(limit)
    const completedOrders = []
    const skippedOrders = []
    const failedOrders = []

    for (const maDH of expiredOrderIds) {
        const transaction = new sql.Transaction()
        let transactionStarted = false

        try {
            await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE)

            transactionStarted = true

            const exchangeProposal = await getExchangeProposalForOrderWithLockService(transaction, maDH)

            let exchangeTextbooks = null

            if (exchangeProposal) {
                exchangeTextbooks = await getExchangeTextbooksForConfirmationWithLockService(transaction, exchangeProposal)
            }

            const order = await getOrderForConfirmationWithLockService(transaction, maDH)

            validateExpiredOrderCompletionService(order)

            let completedExchangeTextbook = null

            if (exchangeProposal) {
                completedExchangeTextbook = await completeExchangeTextbookAndDeductQuantityService(transaction, exchangeProposal)
            }

            const completion = await completeOrderAndDeductQuantityService(transaction, order)
            const notifications = await createOrderAutoCompletedNotificationsService(transaction, order)

            await transaction.commit()
            transactionStarted = false

            const completedOrder = {
                maDH: order.MADH,
                maGT: order.MAGT,
                soLuong: order.SOLUONG,
                ngayHoanThanh: completion.NGAYHOANTHANH
            }

            if (exchangeProposal && exchangeTextbooks && completedExchangeTextbook) {
                completedOrder.traoDoi = {
                    maGTMangDoi: exchangeProposal.MAGTMANGDOI,
                    tenGTMangDoi: exchangeTextbooks.exchangeTextbook.TENGT,
                    soLuongMangDoi: exchangeProposal.SOLUONGMANGDOI,
                    soLuongMangDoiConLai: completedExchangeTextbook.SOLUONG
                }
            }

            completedOrders.push(completedOrder)

            await dispatchNotifications(
                notifications
            )
        }

        catch (error) {
            if (transactionStarted) {
                try {
                    await transaction.rollback()
                }

                catch (rollbackError) {
                    console.error(`Lỗi rollback tự động hoàn tất đơn ${maDH}:`, rollbackError)
                }
            }

            if (error.status === 404 || error.status === 409) {
                skippedOrders.push({maDH, reason: error.message})
                continue
            }

            console.error(`Lỗi tự động hoàn tất đơn ${maDH}:`, error)

            failedOrders.push({maDH, reason: error.message})
        }
    }

    return {
        totalExpired: expiredOrderIds.length,
        totalCompleted: completedOrders.length,
        totalSkipped: skippedOrders.length,
        totalFailed: failedOrders.length,
        completedOrders,
        skippedOrders,
        failedOrders
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
    markOrderDelivered,
    confirmOrderReceived,
    reportOrderIssue,
    autoCompleteExpiredOrders,
    getPendingSellingOrderCount
}