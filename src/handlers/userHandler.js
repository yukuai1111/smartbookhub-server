const {getOtherInfo}=require('../services/userService.js')

const otherInfo = async (req, res, next) => {
    try {
        const { userId } = req.valid
        const user = await getOtherInfo(userId)
        res.ok('获取用户其他成功', user)
    } catch (err) {
        next(err)
    }
}
module.exports={
    otherInfo
}
