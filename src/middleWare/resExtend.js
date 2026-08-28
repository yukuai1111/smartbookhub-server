//挂载快捷返回方法
module.exports = (req, res, next) => {
    //失败返回
    res.no = (errMessage, status = 400, data = '') => {
        res.send({
            status,
            message: errMessage,
            success: false,
            data
        })
    }
    //成功返回
    res.ok = (message = "处理成功", data = '') => {
        res.send({
            status: 200,
            message,
            success: true,
            data
        })
    }
    next()
}