const jwt = require('jsonwebtoken')

const {
    addSocket,
    removeSocket,
    getSockets
} = require('../services/presenceService')


function initializeSocket(io){
    io.use((socket, next) =>{
        try {
            const token = socket.handshake.auth?.token

            if (!token){
                const error = new Error('Thiếu token xác thực!')
                error.data = {status: 401}
                return next(error)
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET)

            if (!decoded.MATK){
                const error = new Error('Token không hợp lệ!')
                error.data = {status: 401}
                return next(error)
            }

            socket.user = decoded

            next()
        }

        catch(error){
            const socketError = new Error('Token không hợp lệ hoặc đã hết hạn!')
            socketError.data = {status: 401}
            next(socketError)
        }
    })

    io.on('connection', (socket) => {
        const userId = socket.user.MATK

        addSocket(userId, socket.id)

        const userRoom = `user:${userId}`

        socket.join(userRoom)

        if (getSockets(userId).size === 1){
            io.emit("user:online", {
                userId
            });
        }

        console.log(`Socket connected: ${socket.id} - MATK: ${userId}`)

        socket.on('disconnect', (reason) => {
            removeSocket(userId, socket.id)

            if (getSockets(userId).size === 0){
                io.emit("user:offline", {
                    userId
                });
            }

            console.log(`Socket disconnected: ${socket.id} - MATK: ${userId} - Lý do: ${reason}`)
        })
    })
}


module.exports = {initializeSocket}