const {
    createOrder: createOrderWorkflow,
    confirmOrder: confirmOrderWorkflow,
    getBuyingOrders: getBuyingOrdersWorkflow,
    getSellingOrders: getSellingOrdersWorkflow
} = require('../services/orderWorkflowService')

const {
    validateCreateOrder,
    validateOrderId,
    validateOrderListQuery
} = require('../validators/orderValidator')


function handleOrderError(res, error, action) {
    console.log(`Lỗi ${action}:`, error)

    if (error.status) {
        return res.status(error.status).json({message: error.message})
    }

    return res.status(500).json({message: `Không thể ${action}!`})
}


// Người mua tạo yêu cầu giao dịch
async function createOrder(req, res) {
    const validation = validateCreateOrder(req.body)

    if (!validation.isValid) {
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        const order = await createOrderWorkflow(validation.data, req.user.MATK)

        return res.status(201).json({message: 'Gửi yêu cầu giao dịch thành công!', order})
    }

    catch (error) {
        return handleOrderError(res, error, 'tạo yêu cầu giao dịch')
    }
}


// Người bán xác nhận yêu cầu giao dịch
async function confirmOrder(req, res) {
    const validation = validateOrderId(req.params.maDH)

    if (!validation.isValid) {
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        const order = await confirmOrderWorkflow(validation.data.maDH, req.user.MATK)

        return res.status(200).json({message: 'Xác nhận yêu cầu giao dịch thành công!', order})
    }

    catch (error) {
        return handleOrderError(res, error, 'xác nhận yêu cầu giao dịch')
    }
}



async function getBuyingOrders(req, res) {
    const validation = validateOrderListQuery(req.query)

    if (!validation.isValid) {
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        const result = await getBuyingOrdersWorkflow(req.user.MATK, validation.data.page, validation.data.limit)

        return res.status(200).json(result)
    }

    catch (error) {
        return handleOrderError(res, error, 'lấy danh sách đơn mua')
    }
}



async function getSellingOrders(req, res) {
    const validation = validateOrderListQuery(req.query)

    if (!validation.isValid) {
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        const result = await getSellingOrdersWorkflow(req.user.MATK, validation.data.page, validation.data.limit)

        return res.status(200).json(result)
    }

    catch (error) {
        return handleOrderError(res, error, 'lấy danh sách đơn bán')
    }
}


module.exports = {
    createOrder,
    confirmOrder,
    getBuyingOrders,
    getSellingOrders
}