//引入数据库
const {pool} = require('../mysql/mysql.js')
const { registerUser, loginUser } = require('../services/logRegService.js')
//注册
const register = async (req, res, next) => {
    try {
        const { username, password, phone } = req.valid
        const userId = await registerUser(username, password, phone)
        res.ok('注册成功！', { userId })
    }
    catch (err) {
        next(err)
    }

}
//登录
const login = async (req, res, next) => {
    try {
        const { account, password } = req.valid
        const result = await loginUser(account, password)
        res.ok('登录成功！', result)
    }
    catch (err) {
        next(err)
    }
}

module.exports = {
    register,
    login
}