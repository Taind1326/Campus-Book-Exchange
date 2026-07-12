const {sql} = require('../config/db')

async function getAllTextbooks(req, res) {
    try{
        const result = await sql.query`SELECT*
                                        FROM GIAOTRINH
                                        ORDER BY NGAYDANG DESC`
        res.json(result.recordset)
    }

    catch(error){
        console.log(error)
        res.status(500).json({message:'Loi lay danh sach giao trinh'})
    }
}


async function createTextbook(req, res) {
    const {TENGT, SOLUONG, DONGIA, HOCKY, MAMH, MOTA, LOAI} = req.body;

    if (!TENGT || SOLUONG == undefined || DONGIA == undefined || HOCKY == undefined|| !MAMH || !LOAI){
        return res.status(400).json({message: "Vui lòng nhập đầy đủ thông tin!"})
    }

    if (SOLUONG <= 0){
        return res.status(400).json({message: "Số lượng phải lớn hơn 0"})
    }

    if(!['Bán', 'Tặng', 'Trao đổi'].includes(LOAI)){
        return res.status(400).json({message: "Loại giáo trình không hợp  lệ!"})
    }

    if (LOAI == 'Bán' && DONGIA <= 0){
        return res.status(400).json({message: 'Giá bán phải lớn hơn 0!'})
    }

    res.status(200).json({message:'Dữ liệu hợp lệ', data: req.body})

}


module.exports = {getAllTextbooks, createTextbook}