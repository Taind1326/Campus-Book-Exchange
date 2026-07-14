const {getCourses} = require('../services/courseService')

async function getAllCourses(req, res) {
    const keyword = typeof req.query.q === 'string' ? req.query.q.trim() : ''
    
    try {
        const courses = await getCourses(keyword)

        return res.status(200).json(courses)
    }

    catch(error){
        console.log('Lỗi lấy danh sách môn học: ',error)
        console.log(error)
        console.log(error.message)
        return res.status(500).json({message: 'Không thể lấy danh sách môn học!'})
    }
}

module.exports = {getAllCourses}