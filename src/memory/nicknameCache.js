//全局昵称缓存
const {nickCache,adminSet} = require('../mysql/mysql.js')

//获取某个昵称所用的人数
const getNickCacheCount=(nickname)=>{
    return nickCache.get(nickname)?.size||0
}

//判断是否是管理员
const isAdmin=(userId)=>{
    return adminSet.has(userId)
}

module.exports={
    getNickCacheCount,
    isAdmin
}
