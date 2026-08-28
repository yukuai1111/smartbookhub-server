const {total,chart}=require('../handlers/adminHandler.js')
const express = require('express')
const router = express.Router()
//获取统计数据
router.get('/total',total)
//获取统计图表
router.get('/chart',chart)
module.exports = router