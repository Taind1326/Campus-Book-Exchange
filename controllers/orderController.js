const {createOrder: createOrderService} = require('../services/orderWorkflowService')
const {validateCreateOrder} = require('../validators/orderValidator')

async function createOrder(req, res) {
    const validation = validateCreateOrder(req.body)

    if (!validation.isValid){
        return res.status(validation.status).json({message: validation.message})
    }

    try {
        const order = await createOrderService(validation.data, req.user.MATK)

        return res.status(201).json({message: 'Gửi yêu cầu giao dịch thành công!', order})
    }

    catch(error){
        console.log('Lỗi tạo yêu cầu giao dịch: ', error)
        return res.status(error.status || 500).json({message: error.status ? error.message: 'Không thể tạo yêu cầu giao dịch!'})
    }
}

module.exports = {createOrder}