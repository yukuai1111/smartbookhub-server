const {totalData,chartData}=require('../services/adminService.js')
//获取统计数据
const total = async (req, res, next) => {
    try {
        const result = await totalData()
        res.ok('获取统计数据成功',result)
    }
    catch (err) {
        next(err)
    }
}
//获取统计图表
const chart = async (req, res, next) => {
    try {
        const result = await chartData()
        res.ok('获取统计图表成功',result)
    }
    catch (err) {
        next(err)
    }
}
module.exports={
    total,
    chart
}
