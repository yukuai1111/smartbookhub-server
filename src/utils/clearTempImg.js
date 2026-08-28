const path = require('path')
const fs = require('fs')

//清除临时封面
const clearTempCover = (filename,subDir) => {
    if (!filename || filename === 'default.jpg') return
    //如果文件存在就删除
    const filePath = path.resolve(`public/images/${subDir}`, filename)
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
        }
    } catch (err) {
        console.log(`删除临时${subDir}文件失败，请重试`)
    }
}
module.exports = clearTempCover