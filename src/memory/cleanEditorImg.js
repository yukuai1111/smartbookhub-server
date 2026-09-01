//定时清除插图缓存
const schedule = require('node-schedule')
const fs = require('fs')
const path = require('path')
const { pool } = require('../mysql/mysql.js')
const cleanEditorImg = () => {
    //定时规则
    const cronRule = '0 */1 * * * ' //每1小时执行一次清除
    //注册定时任务
    schedule.scheduleJob(cronRule, async () => {
        console.log('开启定时任务：开始扫描插图脏数据')
        try {
            //查找数据库，找出没有和文章code绑定的插图并且创建时间大于3小时的
            const [imgResult] = await pool.query(`
                select 
                id,
                imgUrl 
                from article_imgs 
                where articleCode is null and create_time<date_sub(now(),interval 3 hour)`)
            if (imgResult.length === 0) return console.log('扫描完毕：未发现有脏数据')
            //有脏数据就清除
            const imgPublicPath = path.join(__dirname, '../../public')
            for (const img of imgResult) {
                //清除数据库
                await pool.query('delete from article_imgs where id=? and imgUrl=?', [img.id, img.imgUrl])
                //清除磁盘
                const imgPath = path.join(imgPublicPath, img.imgUrl)
                if (fs.existsSync(imgPath)) {
                    fs.unlinkSync(imgPath)
                }
            }
            console.log('扫描完毕：总共删除' + imgResult.length + '条脏数据')
        } catch (err) {
            console.log('清除插图脏数据失败：', err)
        }
        console.log('每1小时执行一次清除插图脏数据任务')
    })
}
module.exports=cleanEditorImg