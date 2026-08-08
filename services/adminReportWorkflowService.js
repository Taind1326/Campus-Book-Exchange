const {sql} = require('../config/db')

const {
    dispatchNotifications
} = require(
    './notificationDispatchService'
)

const {
    claimReport:
        claimReportService,

    getReportForProcessingWithLock:
        getReportForProcessingWithLockService,

    resolveReport:
        resolveReportService,

    validateReportClaim:
        validateReportClaimService,

    validateReportResolution:
        validateReportResolutionService
} = require('./adminReportService')

const {
    cancelOrderAndReleaseQuantity:
        cancelOrderAndReleaseQuantityService,

    completeDisputedOrderAndDeductQuantity:
        completeDisputedOrderAndDeductQuantityService,

    getOrderForConfirmationWithLock:
        getOrderForConfirmationWithLockService
} = require('./orderService')

const {
    completeExchangeTextbookAndDeductQuantity:
        completeExchangeTextbookAndDeductQuantityService,

    getExchangeProposalForOrderWithLock:
        getExchangeProposalForOrderWithLockService,

    getExchangeTextbooksForConfirmationWithLock:
        getExchangeTextbooksForConfirmationWithLockService,

    releaseExchangeTextbookQuantity:
        releaseExchangeTextbookQuantityService
} = require('./exchangeService')

const {
    createReportResolvedNotifications:
        createReportResolvedNotificationsService
} = require('./notificationService')

const {
    insertAdminAuditLog:
        insertAdminAuditLogService
} = require('./adminAuditService')


function formatReportData(report) {
    return {
        maBC: report.MABC,
        nguoiBaoCao:
            report.NGUOIBAOCAO,

        nguoiBiBaoCao:
            report.NGUOIBIBAOCAO,

        doiTuongBaoCao:
            report.DOITUONGBAOCAO,

        maDH: report.MADH,
        maTN: report.MATN,

        loaiBaoCao:
            report.LOAIBAOCAO,

        trangThai:
            report.TRANGTHAI,

        nguoiXuLy:
            report.NGUOIXULY,

        ketQuaXuLy:
            report.KETQUAXULY,

        ngayXuLy:
            report.NGAYXULY
    }
}


async function insertReportAuditLog(
    transaction,
    adminId,
    action,
    reportBefore,
    reportAfter,
    auditContext,
    options = {}
) {
    await insertAdminAuditLogService(
        transaction,
        {
            adminId,
            hanhDong: action,
            doiTuong: 'Báo cáo',

            maDoiTuong:
                reportBefore.MABC,

            duLieuTruoc:
                formatReportData(
                    reportBefore
                ),

            duLieuSau: {
                ...formatReportData(
                    reportAfter
                ),

                ...options.duLieuBoSung
            },

            lyDo:
                options.lyDo ?? null,

            ip:
                auditContext.ip ?? null,

            userAgent:
                auditContext.userAgent ??
                null
        }
    )
}


async function claimReportWorkflow(
    reportId,
    adminId,
    auditContext = {}
) {
    const transaction =
        new sql.Transaction()

    let transactionStarted = false


    try {
        await transaction.begin(
            sql.ISOLATION_LEVEL.SERIALIZABLE
        )

        transactionStarted = true


        const report =
            await getReportForProcessingWithLockService(
                transaction,
                reportId
            )


        validateReportClaimService(
            report,
            adminId
        )


        const claimedReport =
            await claimReportService(
                transaction,
                report.MABC,
                adminId
            )


        await insertReportAuditLog(
            transaction,
            adminId,
            'Nhận xử lý báo cáo',
            report,
            claimedReport,
            auditContext
        )


        await transaction.commit()
        transactionStarted = false


        return {
            maBC:
                claimedReport.MABC,

            doiTuongBaoCao:
                claimedReport
                    .DOITUONGBAOCAO,

            maDH:
                claimedReport.MADH,

            maTN:
                claimedReport.MATN,

            loaiBaoCao:
                claimedReport
                    .LOAIBAOCAO,

            trangThai:
                claimedReport.TRANGTHAI,

            nguoiXuLy:
                claimedReport.NGUOIXULY
        }
    }

    catch (error) {
        if (transactionStarted) {
            try {
                await transaction.rollback()
            }

            catch (rollbackError) {
                console.log(
                    'Lỗi rollback nhận xử lý báo cáo:',
                    rollbackError
                )
            }
        }


        throw error
    }
}


async function resolveReportWorkflow(
    reportId,
    adminId,
    data,
    auditContext = {}
) {
    const transaction =
        new sql.Transaction()

    let transactionStarted = false


    try {
        await transaction.begin(
            sql.ISOLATION_LEVEL.SERIALIZABLE
        )

        transactionStarted = true


        const report =
            await getReportForProcessingWithLockService(
                transaction,
                reportId
            )


        validateReportResolutionService(
            report,
            adminId
        )


        let order = null
        let orderStatus = null
        let completionDate = null

        let exchangeProposal = null
        let exchangeTextbooks = null

        let processedExchangeTextbook =
            null

        let exchangeProcessing = null


        if (
            report.DOITUONGBAOCAO ===
                'Giao dịch' &&
            report.MADH
        ) {
            exchangeProposal =
                await getExchangeProposalForOrderWithLockService(
                    transaction,
                    report.MADH
                )


            if (exchangeProposal) {
                exchangeTextbooks =
                    await getExchangeTextbooksForConfirmationWithLockService(
                        transaction,
                        exchangeProposal
                    )
            }


            order =
                await getOrderForConfirmationWithLockService(
                    transaction,
                    report.MADH
                )

            orderStatus =
                order.TRANGTHAI


            if (
                order.TRANGTHAI ===
                'Tranh chấp'
            ) {
                if (
                    data.ketLuan ===
                    'Hợp lệ'
                ) {
                    if (exchangeProposal) {
                        await releaseExchangeTextbookQuantityService(
                            transaction,
                            exchangeProposal,
                            order.TRANGTHAI
                        )

                        exchangeProcessing =
                            'Trả số lượng đang giữ'
                    }


                    await cancelOrderAndReleaseQuantityService(
                        transaction,
                        order
                    )

                    orderStatus = 'Đã hủy'
                }

                else {
                    if (exchangeProposal) {
                        processedExchangeTextbook =
                            await completeExchangeTextbookAndDeductQuantityService(
                                transaction,
                                exchangeProposal
                            )

                        exchangeProcessing =
                            'Hoàn tất và trừ số lượng'
                    }


                    const completion =
                        await completeDisputedOrderAndDeductQuantityService(
                            transaction,
                            order
                        )

                    orderStatus = 'Hoàn tất'

                    completionDate =
                        completion.NGAYHOANTHANH
                }
            }
        }


        const resolvedReport =
            await resolveReportService(
                transaction,
                report.MABC,
                adminId,
                data
            )


        const notifications =
            await createReportResolvedNotificationsService(
                transaction,
                report,
                data
            )


        await insertReportAuditLog(
            transaction,
            adminId,
            'Kết luận báo cáo',
            report,
            resolvedReport,
            auditContext,
            {
                lyDo:
                    data.ketQuaXuLy,

                duLieuBoSung: {
                    trangThaiDonHang:
                        orderStatus,

                    ngayHoanThanh:
                        completionDate,

                    xuLyTraoDoi:
                        exchangeProcessing
                }
            }
        )


        await transaction.commit()
        transactionStarted = false


        await dispatchNotifications(
            notifications
        )


        const result = {
            maBC:
                resolvedReport.MABC,

            doiTuongBaoCao:
                resolvedReport
                    .DOITUONGBAOCAO,

            maDH:
                resolvedReport.MADH,

            maTN:
                resolvedReport.MATN,

            ketLuan:
                resolvedReport.TRANGTHAI,

            ketQuaXuLy:
                resolvedReport.KETQUAXULY,

            nguoiXuLy:
                resolvedReport.NGUOIXULY,

            ngayXuLy:
                resolvedReport.NGAYXULY,

            trangThaiDonHang:
                orderStatus,

            ngayHoanThanh:
                completionDate
        }


        if (
            exchangeProposal &&
            exchangeTextbooks &&
            exchangeProcessing
        ) {
            result.traoDoi = {
                maGTDuocDoi:
                    exchangeProposal
                        .MAGTDUOCDOI,

                maGTMangDoi:
                    exchangeProposal
                        .MAGTMANGDOI,

                tenGTMangDoi:
                    exchangeTextbooks
                        .exchangeTextbook
                        .TENGT,

                soLuongMangDoi:
                    exchangeProposal
                        .SOLUONGMANGDOI,

                xuLy:
                    exchangeProcessing,

                soLuongMangDoiConLai:
                    processedExchangeTextbook
                        ? (
                            processedExchangeTextbook
                                .SOLUONG
                        )
                        : (
                            exchangeTextbooks
                                .exchangeTextbook
                                .SOLUONG
                        )
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
                    'Lỗi rollback kết luận báo cáo:',
                    rollbackError
                )
            }
        }


        throw error
    }
}


module.exports = {
    claimReportWorkflow,
    resolveReportWorkflow
}