const jwt = require('jsonwebtoken')
const {sql} = require('../config/db')


async function authenticateToken(req, res, next) {
    const authorizationHeader = req.headers.authorization

    if (!authorizationHeader) {
        return res.status(401).json({message: 'Vui lòng đăng nhập để sử dụng chức năng này!'})
    }

    const [tokenType, token] =  authorizationHeader.split(' ')

    if (tokenType !== 'Bearer' || !token) {
        return res.status(401).json({message: 'Token không hợp lệ!'})
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const accountId = Number(decoded.MATK)

        if (!Number.isInteger(accountId) || accountId <= 0) {
            return res.status(401).json({message: 'Token không hợp lệ!'})
        }

        const request = new sql.Request()

        request.input('MATK', sql.Int, accountId)

        const result = await request.query(`
            UPDATE TAIKHOAN
            SET TRANGTHAI = N'Hoạt động',
                LYDOHANCHED = NULL,
                HANCHEDEN = NULL
            WHERE MATK = @MATK
              AND TRANGTHAI IN (
                  N'Bị hạn chế',
                  N'Tạm khóa'
              )
              AND HANCHEDEN IS NOT NULL
              AND HANCHEDEN <= SYSDATETIME();

            SELECT MATK, TENTK, VAITRO, TRANGTHAI,
                   LYDOHANCHED, HANCHEDEN
            FROM TAIKHOAN
            WHERE MATK = @MATK;`)

        const accounts = result.recordset || []

        if (accounts.length === 0) {
            return res.status(401).json({message: 'Tài khoản không còn tồn tại!'})
        }

        const account = accounts[0]

        if (account.TRANGTHAI === 'Tạm khóa') {
            return res.status(403).json({message: 'Tài khoản đang tạm bị khóa!'})
        }

        if (account.TRANGTHAI === 'Đã khóa') {
            return res.status(403).json({message: 'Tài khoản đã bị khóa!'})
        }

        req.user = {
            MATK: account.MATK,
            TENTK: account.TENTK,
            VAITRO: account.VAITRO,
            TRANGTHAI: account.TRANGTHAI
        }

        return next()
    }

    catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({message: 'Phiên đăng nhập đã hết hạn!'})
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({message: 'Token không hợp lệ!'})
        }

        console.log('Lỗi xác thực token!', error)

        return res.status(500).json({message: 'Lỗi xác thực tài khoản!'})
    }
}


module.exports = {
    authenticateToken
}