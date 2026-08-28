//用于校验出错时，清除临时封面
const attachUpload = (subDir) => {
    return (req, res, next) => {
        req._uploadFilename = req.file?.filename ?? null
        req._uploadSubDir = subDir
        next()
    }
}
module.exports = attachUpload
