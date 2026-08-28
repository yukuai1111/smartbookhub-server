// 判断错误是否由客户端主动取消触发
const isAbortError = (err) => {
    if (!err) return false
    const errStr = String(err)
    return err.name === 'AbortError'
        || err.name === 'ModelAbortError'
        || errStr.includes('AbortError')
        || errStr.toLowerCase().includes('aborted')
}

// 为流式响应创建取消信号的监听器
// 返回 { cancelled, signal }
//cancelled：判断是否断开，断开不写入数据库
//signal：取消信号，用于通知ai任务停止执行
const createAbortWatcher = (req, res, label) => {
    const cancelled = { value: false }
    //取消控制器，生成取消信号
    const controller = new AbortController()

    //断开时执行的回调函数
    const onDisconnect = () => {
        //响应正常结束
        if (res.writableEnded) return
        cancelled.value = true
        controller.abort()  //停止ai任务
        console.log(`${label}：客户端已断开`)
    }

    req.on('close', onDisconnect)
    res.on('close', onDisconnect)
    //清除监视器
    const clearWatcher = () => {
        req.removeListener('close', onDisconnect)
        res.removeListener('close', onDisconnect)
    }
    return {signal: controller.signal, controller, clearWatcher }
}
module.exports = {
    isAbortError,
    createAbortWatcher
}
