const { pool } = require('../mysql/mysql.js')
const BusinessError = require('../utils/errorHandler.js')
const bcrypt = require('bcryptjs')
const generateUserId = require('../utils/generateUserId.js')
//生成token
const jwt = require('jsonwebtoken')
require('dotenv').config()
//读取TokenKey
const key = process.env.TokenKey
const expiresIn = process.env.TokenExpire

//注册
const registerUser = async (username, password, phone) => {
    //判断用户名/手机号重复
    const [userResult] = await pool.query(`
        select 
        id,
        username,
        phone 
        from users 
        where username=? or phone=? 
        limit 1`,
        [username, phone])
    if (userResult.length !== 0) {
        if (userResult[0].username === username) throw new BusinessError('用户名已存在')
        else throw new BusinessError('手机号已存在')
    }
    //都没重复，生成id
    const userId = generateUserId('user')
    //加密密码
    const hashPsd = bcrypt.hashSync(password, 10)
    //插入数据库
    const [insertResult] = await pool.query(`
        insert into users
        (id,username,phone,password,avatar)
        values(?,?,?,?,?)`,
        [userId, username, phone, hashPsd, '/images/avatar/default.jpg'])
    if (!insertResult.affectedRows) throw new BusinessError('注册失败')
    return userId
}
//登录
const loginUser = async (account, password) => {
    //判断用户存不存在      
    const [userResult] = await pool.query('select id,password,user_type,username,avatar,token_version,nickname from users where (username=? or phone=?) and is_deleted=0', [account, account])
    if (userResult.length === 0) throw new BusinessError('用户不存在')
    let user = userResult[0]
    //判断密码正确与否
    const isMatch = bcrypt.compareSync(password, user.password)
    if (!isMatch) throw new BusinessError('密码错误')
    //登录成功
    //生成token
    const token = jwt.sign(
        { userId: user.id, username: user.username, userType: user.user_type, tokenVersion: user.token_version },
        key,
        { expiresIn }       //过期时间7天
    )
    return {
        token,
        userInfo: { userId: user.id, nickname: user.nickname, userType: user.user_type, avatar: user.avatar }
    }
}

module.exports = {
    registerUser,
    loginUser
}
