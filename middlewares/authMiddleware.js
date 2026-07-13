const jwt = require('jsonwebtoken')
const {sql} = require('../config/db')

async function authenticateToken(req, res, next) {
    const authorizationHeader = req.headers.authorization

    if (!authorizationHeader){
        return res.status(401).json({message: 'Vui lòng đăng nhập để sử dụng chức năng này!'})
    }

    const [tokenType, token] = authorizationHeader.split(' ')

    if (tokenType !== 'Bearer' || !token){
        return res.status(401).json({message: 'Token không hợp lệ!'})
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        const result = await sql.query`
            SELECT MATK, TENTK, VAITRO, TRANGTHAI
            FROM TAIKHOAN
            WHERE MATK = ${decoded.MATK}`

        if (result.recordset.length === 0){
            return res.status(401).json({message: 'Tài khoản không còn tồn tại!'})
        }

        const taiKhoan = result.recordset[0]

        if (taiKhoan.TRANGTHAI === 'Tạm khóa'){
            return res.status(403).json({message: 'Tài khoản đang tạm bị khóa!'})
        }

        if (taiKhoan.TRANGTHAI === 'Đã khóa'){
            return res.status(403).json({message: 'Tài khoản đã bị khóa!'})
        }

        req.user = {
            MATK: taiKhoan.MATK,
            TENTK: taiKhoan.TENTK,
            VAITRO: taiKhoan.VAITRO,
            TRANGTHAI: taiKhoan.TRANGTHAI
        }

        next()
    }
    
    catch(error){
        if (error.name === 'TokenExpiredError'){
            return res.status(401).json({message: 'Phiên đăng nhập đã hết hạn!'})
        }

        if (error.name === 'JsonWebTokenError'){
            return res.status(401).json({message: 'Token không hợp lệ!'})
        }

        console.log('Lỗi xác thực token!', error)

        return res.status(500).json({message: 'Lỗi xác thực tài khoản!'})
    }
}

module.exports = {authenticateToken}