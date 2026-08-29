//接收文件的中间件
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const BusinessError = require('../utils/errorHandler.js')
const createUpload = (subDir,maxSize=1024*1024*5) => {  //默认最大5MB
        //配置文件存储方式
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            //这时候还没有req.file,但可以获取到请求体，请求体等参数
            //file是原生的文件对象
            const dir = `public/images/${subDir}`
            if (!fs.existsSync(dir)) {
                //不存在就创建
                fs.mkdirSync(dir, { recursive: true })  //递归创建目录
            }
            cb(null, dir)  //文件存放地
        },
        filename: (req, file, cb) => {
            //这时候还没有req.file,但可以获取到请求体，请求体等参数
            //file是原生的文件对象
            const name = Date.now() + '-' + Math.round(Math.random() * 1E9)
            cb(null, name + path.extname(file.originalname))
        }
    })
    const upload = multer({
        storage,
        limits: {
            fileSize: maxSize
        },
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.startsWith('image/')) {
                return cb(new BusinessError('请上传图片文件'))
            }
            cb(null, true)
        }
    })
    return upload
}
//文章封面
const uploadCover = createUpload('cover',1024*1024*5)
//用户头像
const uploadAvatar = createUpload('avatar',1024*1024*2)
//文章插图
const uploadEditor=createUpload('editor',1024*1024*5)

module.exports ={
    uploadCover,
    uploadAvatar,
    uploadEditor
}
