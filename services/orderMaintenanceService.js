const {
    autoCompleteExpiredOrders
} = require('./orderWorkflowService')

let isProcessing = false
let lastRunAt = 0

const COOLDOWN_MS = 60 * 1000


function triggerExpiredOrderCompletion() {
    const now = Date.now()

    if (isProcessing) {
        return false
    }

    if (now - lastRunAt < COOLDOWN_MS) {
        return false
    }

    isProcessing = true
    lastRunAt = now

    autoCompleteExpiredOrders(50).then(result => {
            if (
                result.totalCompleted > 0 ||
                result.totalFailed > 0
            ) {
                console.log(
                    'Kết quả tự động hoàn tất đơn:',
                    result
                )
            }
        })
        .catch(error => {
            console.error(
                'Lỗi chạy kiểm tra đơn quá hạn:',
                error
            )
        })
        .finally(() => {
            isProcessing = false
        })

    return true
}


module.exports = {
    triggerExpiredOrderCompletion
}