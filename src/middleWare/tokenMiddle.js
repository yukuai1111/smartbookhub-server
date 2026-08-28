const jwt = require('jsonwebtoken');
require('dotenv').config()
//读取TokenKey
const key = process.env.TokenKey
const BusinessError = require('../utils/errorHandler.js')
const {pool} = require('../mysql/mysql.js')
//验证token
const verifyToken = async (req, res, next) => {
    //判断是不是可以游客走的接口，是的话直接放行
    const whiteUrl=['/api/article/userList','/api/article/detail','/api/article/recommend']
    const isWhite=whiteUrl.some(url=>{
        return req.originalUrl.startsWith(url)
    })
    if(isWhite) return next()
    //从前端请求头里获取token
    const auth = req.headers.authorization
    //如果没有token，就退出
    if (!auth) return next(new BusinessError('未登录，请先登录！', 401))
    const token = auth.split(' ')[1]
    if (!token) return next(new BusinessError('未登录，请先登录！', 401))
    //如果有，验证合法性
    try {
        const decoded = jwt.verify(token, key);
        //判断用户是否存在
        const [userResult] = await pool.query('select id,user_type,token_version from users where id=? and is_deleted=0', [decoded.userId])
        const user = userResult[0]
        //验证token版本号
        if (decoded.tokenVersion !== user.token_version) return next(new BusinessError('token版本号错误，请重新登录', 401))
        //除了获取用户信息，其他接口管理员暂不支持
        if (req.originalUrl.startsWith('/api/front/') && user.user_type === 1) {
                return next(new BusinessError('管理员暂不支持该功能'))
        }
        //获取统计数据只能是管理员
        if (req.originalUrl.startsWith('/api/admin/') && user.user_type !== 1)
            return next(new BusinessError('非管理员不能获取统计数据'))

        req.user = {
            userId: user.id,
            userType: user.user_type
        }
        next()
    }
    catch (err) {
        //如果验证失败,传递给入口文件
        next(err)
    }
}

//暴露中间件
module.exports = verifyToken
