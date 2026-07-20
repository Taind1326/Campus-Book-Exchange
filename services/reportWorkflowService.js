const {sql} = require('../config/db')
const {
    getOrderForReport, 
    validateReportOrder,
    checkExistingReport, 
    insertReport
} = require('./reportService')


async function createReport(data, nguoiBaoCao) {
    const transaction = new sql.Transaction()
    let transactionStarted = false

    try {
        await transaction.begin()
        transactionStarted = true

        const order = await getOrderForReport(transaction, data.maDH)
        const nguoiBiBaoCao = validateReportOrder(order, nguoiBaoCao)

        await checkExistingReport(transaction, data.maDH, nguoiBaoCao)

        const report = await insertReport(transaction, nguoiBaoCao, nguoiBiBaoCao, data)

        await transaction.commit()
        transactionStarted = false

        return report
    }

    catch(error){
        if (transactionStarted){
            try {
                await transaction.rollback()
            }

            catch(rollbackError){
                console.error('Lỗi rollback tạo báo cáo: ',rollbackError)
            }
        }

        throw error
    }
}


module.exports = {createReport}