const {sql} = require('../config/db')
const {getIO} = require('../config/socket')

const {
    getReportForProcessingWithLock: getReportForProcessingWithLockService,
    validateReportClaim: validateReportClaimService,
    claimReport: claimReportService,
    validateReportResolution: validateReportResolutionService,
    resolveReport: resolveReportService
} = require('./adminReportService')


const {
    getOrderForConfirmationWithLock: getOrderForConfirmationWithLockService,
    cancelOrderAndReleaseQuantity: cancelOrderAndReleaseQuantityService,
    completeDisputedOrderAndDeductQuantity: completeDisputedOrderAndDeductQuantityService
} = require('./orderService')

const {
    getExchangeProposalForOrderWithLock: getExchangeProposalForOrderWithLockService,
    getExchangeTextbooksForConfirmationWithLock: getExchangeTextbooksForConfirmationWithLockService,
    releaseExchangeTextbookQuantity: releaseExchangeTextbookQuantityService,
    completeExchangeTextbookAndDeductQuantity: completeExchangeTextbookAndDeductQuantityService
} = require('./exchangeService')


const {
    createReportResolvedNotifications: createReportResolvedNotificationsService
} = require('./notificationService')

async function claimReportWorkflow(maBC, adminId) {
    const transaction = new sql.Transaction()
    let transactionStarted = false

    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE)

        transactionStarted = true

        const report = await getReportForProcessingWithLockService(transaction, maBC)

        validateReportClaimService(report, adminId)

        const claimedReport = await claimReportService(transaction, report.MABC, adminId)

        await transaction.commit()
        transactionStarted = false

        return {
            maBC: claimedReport.MABC,
            doiTuongBaoCao:
                claimedReport.DOITUONGBAOCAO,
            maDH: claimedReport.MADH,
            maTN: claimedReport.MATN,
            loaiBaoCao: claimedReport.LOAIBAOCAO,
            trangThai: claimedReport.TRANGTHAI,
            nguoiXuLy: claimedReport.NGUOIXULY
        }
    }

    catch (error) {
        if (transactionStarted) {
            try {
                await transaction.rollback()
            }

            catch (rollbackError) {
                console.log('Lỗi rollback nhận xử lý báo cáo:', rollbackError)
            }
        }

        throw error
    }
}



async function resolveReportWorkflow(maBC, adminId, data) {
    const transaction = new sql.Transaction()
    let transactionStarted = false

    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE)

        transactionStarted = true

        const report = await getReportForProcessingWithLockService(transaction, maBC)

        validateReportResolutionService(report, adminId)

        let order = null
        let trangThaiDonHang = null
        let ngayHoanThanh = null
        let exchangeProposal = null
        let exchangeTextbooks = null
        let processedExchangeTextbook = null

        if (report.DOITUONGBAOCAO === 'Giao dịch' && report.MADH) {
            exchangeProposal = await getExchangeProposalForOrderWithLockService(transaction, report.MADH)

            if (exchangeProposal) {
                exchangeTextbooks = await getExchangeTextbooksForConfirmationWithLockService(transaction, exchangeProposal)
            }

            order = await getOrderForConfirmationWithLockService(transaction, report.MADH)

            trangThaiDonHang = order.TRANGTHAI

            if (order.TRANGTHAI === 'Tranh chấp') {
                if (data.ketLuan === 'Hợp lệ') {
                    if (exchangeProposal) {
                        await releaseExchangeTextbookQuantityService(transaction, exchangeProposal, order.TRANGTHAI)
                    }

                    await cancelOrderAndReleaseQuantityService(transaction, order)

                    trangThaiDonHang = 'Đã hủy'
                }

                else {
                    if (exchangeProposal) {
                        processedExchangeTextbook = await completeExchangeTextbookAndDeductQuantityService(transaction, exchangeProposal)
                    }

                    const completion = await completeDisputedOrderAndDeductQuantityService(transaction, order)

                    trangThaiDonHang = 'Hoàn tất'
                    ngayHoanThanh = completion.NGAYHOANTHANH
                }
            }
        }

        const resolvedReport = await resolveReportService(transaction, report.MABC, adminId, data)
        const notifications = await createReportResolvedNotificationsService(transaction, report, data)

        await transaction.commit()
        transactionStarted = false

        try {
            const io = getIO()

            for (const notification of notifications) {
                io.to(`user:${notification.NGUOINHAN}`).emit('notification:new', notification)
            }
        }

        catch (socketError) {
            console.error('Lỗi gửi realtime kết luận báo cáo:', socketError)
        }

        const result = {
            maBC: resolvedReport.MABC,
            doiTuongBaoCao: resolvedReport.DOITUONGBAOCAO,
            maDH: resolvedReport.MADH,
            maTN: resolvedReport.MATN,
            ketLuan: resolvedReport.TRANGTHAI,
            ketQuaXuLy: resolvedReport.KETQUAXULY,
            nguoiXuLy: resolvedReport.NGUOIXULY,
            ngayXuLy: resolvedReport.NGAYXULY,
            trangThaiDonHang,
            ngayHoanThanh
        }


        if (exchangeProposal && exchangeTextbooks) {
            result.traoDoi = {
                maGTDuocDoi: exchangeProposal.MAGTDUOCDOI,
                maGTMangDoi: exchangeProposal.MAGTMANGDOI,
                tenGTMangDoi: exchangeTextbooks.exchangeTextbook.TENGT,
                soLuongMangDoi: exchangeProposal.SOLUONGMANGDOI,
                xuLy:
                    data.ketLuan === 'Hợp lệ'
                        ? 'Đã trả số lượng đang giữ'
                        : 'Đã trừ số lượng',

                soLuongMangDoiConLai:
                    processedExchangeTextbook
                        ? processedExchangeTextbook.SOLUONG
                        : exchangeTextbooks
                            .exchangeTextbook
                            .SOLUONG
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
                console.log('Lỗi rollback kết luận báo cáo:', rollbackError)
            }
        }

        throw error
    }
}

module.exports = {
    claimReportWorkflow,
    resolveReportWorkflow
}