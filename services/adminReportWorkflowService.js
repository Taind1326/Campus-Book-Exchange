const {sql} = require('../config/db')

const {
    getReportForProcessingWithLock: getReportForProcessingWithLockService,
    validateReportClaim: validateReportClaimService,
    claimReport: claimReportService
} = require('./adminReportService')


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


module.exports = {
    claimReportWorkflow
}