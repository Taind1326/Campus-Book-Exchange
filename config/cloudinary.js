const cloudinary = require('cloudinary').v2


function getRequiredEnv(name) {
    const value = process.env[name]

    if (!value || !value.trim()) {
        throw new Error(`Thiếu biến môi trường ${name}!`)
    }

    return value.trim()
}


cloudinary.config({
    cloud_name: getRequiredEnv('CLOUDINARY_CLOUD_NAME'),
    api_key: getRequiredEnv('CLOUDINARY_API_KEY'),
    api_secret: getRequiredEnv('CLOUDINARY_API_SECRET'),
    secure: true
})


module.exports = cloudinary