//引入mysql
const mysql = require('mysql2/promise')
//引入密钥
require('dotenv').config()
const bcrypt = require('bcryptjs')
const generateUserId = require('../utils/generateUserId.js')
const nickCache = new Map()   //key为昵称,value为用户id容器  只存未注销的用户
const adminSet = new Set()    // 只存管理员id，不需要去找昵称，所以用set
//数据池连接
const pool = mysql.createPool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USERNAME,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4'
})


//初始化管理员账号
async function initAdmin() {
    try {
        //测试连接
        const conn = await pool.getConnection()
        conn.release()  //测试完释放
        //查询是否有管理员账号 
        const [rows] = await pool.query('select id from users where username=?', ['admin'])
        //如果没有，就增加管理员账号
        const id = generateUserId('admin')
        //密码加密
        const hashPsd = bcrypt.hashSync('123456', 10)
        if (!rows.length) {
            await pool.query(
                'insert into users (id,username,password,user_type,phone,nickname,avatar) values (?,?,?,?,?,?,?)',
                [
                    id,
                    'admin',
                    hashPsd,
                    1,
                    '15260707029',
                    '管理员',
                    '/images/avatar/admin.webp'
                ]
            )
            console.log('管理员账号初始化完成')
        } else {
            console.log('管理员账号已存在')
        }
    }
    catch (err) {
        console.log('初始化管理员失败', err)
        throw err
    }
}
//加载所有昵称缓存
const loadAllNickCache = async () => {
    const [users] = await pool.query('select id,nickname,user_type,is_deleted from users')
    //清除旧数据
    nickCache.clear()
    adminSet.clear()
    for (const u of users) {
        //如果是注销的就忽略
        if (u.is_deleted === 1) continue
        //如果是管理员
        if (u.user_type === 1) {
            adminSet.add(u.id)
        }
        //如果名字没有在缓存里，就新建容器
        if (!nickCache.has(u.nickname)) {
            nickCache.set(u.nickname, new Set())
        }
        //加入缓存
        nickCache.get(u.nickname).add(u.id)
    }
}
async function iniSystem() {
    await initAdmin()
    //加载所有昵称缓存
    await loadAllNickCache()
    console.log('昵称缓存初始化完成')
}
//初始化系统
let initRunning=false
function startInit() {
     if (initRunning) return
     initRunning = true
     iniSystem().then(() => {
         console.log('系统初始化完成')
         initRunning = false
     }).catch((err) => {
         console.log('系统初始化失败，5秒后重试', err.code)
         initRunning = false
         setTimeout(startInit, 5000)
     })
 }
 startInit()
module.exports = {pool,nickCache,adminSet}
