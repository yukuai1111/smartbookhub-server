const { pool } = require('../mysql/mysql.js')
const BusinessError = require('../utils/errorHandler.js')
const getOtherInfo = async (userId) => {
    const [userResult] = await pool.query(
        'select id,avatar,username,nickname,signature,create_time,user_type from users where id=? and is_deleted=0', [userId])
    if (userResult.length === 0) throw new BusinessError('用户不存在')
    const user = userResult[0]
    if (user.user_type === 1) throw new BusinessError('管理员信息暂不对外开放！')
    const { user_type, ...rest } = user
    rest.create_time = rest.create_time.getTime()
    return rest
}
module.exports = {
    getOtherInfo
}