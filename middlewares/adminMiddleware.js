function authorizeAdmin(req, res, next) {
    if (!req.user){
        return res.status(401).json({message: 'Vui lòng đăng nhập để sử dụng chức năng này!'})
    }

    if (req.user.VAITRO !== 'Quản trị viên'){
        return res.status(403).json({message: 'Bạn không có quyền truy cập chức năng quản trị!'})
    }

    next()
}


module.exports = {authorizeAdmin}