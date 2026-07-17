let io = null

function setIO(socketIO){
    io = socketIO
}

function getIO(){
    if (!io){
        throw new Error('Socket.IO chưa được khởi tạo!')
    }
    return io
}


module.exports = {setIO, getIO}