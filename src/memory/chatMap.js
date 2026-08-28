//存放每个用户当前运行的聊天请求的取消控制器
//{key：userId,value：{controller,res}}
const map = new Map()
//创建
const createMap = (userId, controller, res) => {
    //如果之前有
    const oldItem = map.get(userId)
    if (oldItem) {
        try {
            //停止
            oldItem.controller?.abort()
            if (oldItem.res && !oldItem.res.writableEnded) oldItem.res.end()
        } catch (err) {
            console.log('清除旧控制器失败', err)
        }
    }
    //创建一个取消控制器
    map.set(userId, { controller, res })
}

//清除所有（退出登录/注销账号）
const clearMapAll = (userId) => {
    if (!map.has(userId)) return
    const item = map.get(userId)
    try {
        item.controller?.abort()
        if (item.res && !item.res.writableEnded) item.res.end()
    } catch (err) {
        console.log('清除所有旧控制器失败', err)
    }
    map.delete(userId)
}
//清除一个控制器（聊天结束）
const clearMap = (userId, controller) => {
    if (!map.has(userId)) return
    const currentController = map.get(userId)
    if (currentController.controller === controller) {
        map.delete(userId)
    }
}
module.exports = {
    createMap,
    clearMap,
    clearMapAll
}
