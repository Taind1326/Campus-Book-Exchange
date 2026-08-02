const jwt = require('jsonwebtoken')
const {sql} = require('../config/db')

const {
    addSocket,
    removeSocket,
    getSockets
} = require('../services/presenceService')


function createSocketError(message, status) {
    const error = new Error(message)
    error.data = { status }
    return error
}


function initializeSocket(io) {
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token

            if (!token) {
                return next(createSocketError('Thiếu token xác thực!', 401))
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET)

            if (!Number.isInteger(decoded.MATK) || decoded.MATK <= 0) {
                return next(createSocketError('Token không hợp lệ!', 401))
            }

            const request = new sql.Request()

            request.input('MATK', sql.Int, decoded.MATK)

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

                SELECT MATK, TENTK, VAITRO,
                       TRANGTHAI
                FROM TAIKHOAN
                WHERE MATK = @MATK;`)

            const account = result.recordset[0]

            if (!account) {
                return next(createSocketError('Tài khoản không còn tồn tại!', 401)
                )
            }

            if (account.TRANGTHAI === 'Tạm khóa') {
                return next(createSocketError('Tài khoản đang tạm bị khóa!', 403)
                )
            }

            if (account.TRANGTHAI === 'Đã khóa') {
                return next(createSocketError('Tài khoản đã bị khóa!', 403)
                )
            }

            socket.user = {
                MATK: account.MATK,
                TENTK: account.TENTK,
                VAITRO: account.VAITRO,
                TRANGTHAI: account.TRANGTHAI
            }

            return next()
        }

        catch (error) {
            if (error.data?.status) {
                return next(error)
            }

            if (error.name === 'TokenExpiredError') {
                return next(createSocketError('Phiên đăng nhập đã hết hạn!', 401))
            }

            if (error.name === 'JsonWebTokenError') {
                return next(createSocketError('Token không hợp lệ!', 401)
                )
            }

            console.error('Lỗi xác thực Socket.IO:', error)

            return next(
                createSocketError('Không thể xác thực tài khoản!', 500)
            )
        }
    })


    io.on('connection', socket => {
        const userId = socket.user.MATK

        addSocket(userId, socket.id)

        socket.join(`user:${userId}`)

        if (getSockets(userId).size === 1) {
            io.emit('user:online', {userId})
        }

        console.log(`Socket connected: ${socket.id} - ` + `MATK: ${userId}`)

        socket.on('disconnect', reason => {
            removeSocket(userId, socket.id)

            if (getSockets(userId).size === 0) {
                io.emit('user:offline', {userId})
            }

            console.log(`Socket disconnected: ${socket.id} - ` + `MATK: ${userId} - Lý do: ${reason}`)
        })
    })
}


module.exports = {
    initializeSocket
}