const {pool} = require('../mysql/mysql.js')
const BusinessError = require('../utils/errorHandler.js')

//获取统计数据（总共的用户、全部文章数量、上线文章和总评论数）
const totalData = async () => {
    //查找用户数量
    const [userResult] = await pool.query('select count(*) userCount from users where is_deleted=0')
    const userCount = userResult[0].userCount
    //全部文章（草稿/上线/下线/待审核）
    const [articleResult] = await pool.query('select count(*) articleCount from articles')
    const articleCount = articleResult[0].articleCount
    //上线文章
    const [publishResult] = await pool.query(`select count(*) as publishCount from articles where status='published'`)
    const publishCount = publishResult[0].publishCount
    //总评论数
    const [commentResult] = await pool.query('select count(*) as commentCount from article_comment where is_deleted=0')
    const commentCount = commentResult[0].commentCount
    return {
        userCount,
        articleCount,
        publishCount,
        commentCount
    }
}

//获取统计图表（7天内新增文章/新增对话统计）
const chartData = async () => {
    //查找7天内的文章（草稿/上线/下线/待审核）
    const [articleResult] = await pool.query(`
        select 
        date_format(createTime,'%m-%d') day,
        count(*) articleCount 
        from articles 
        where createTime>=date_sub(curdate(),interval 6 day)
        group by date_format(createTime,'%m-%d')
        order by day asc`)
    //查找7天内的对话
    const [conversationResult] = await pool.query(`
        select 
        date_format(start_time,'%m-%d') day,
        count(*) conversationCount
        from conversations
        where start_time>=date_sub(curdate(),interval 6 day)
        group by date_format(start_time,'%m-%d')
        order by day asc`)
    //循环生成7天内日期（今天+前6天）
    const dateList = [] //['8-14','8-15','8-16','8-17','8-18','8-19','8-20']
    //生成7天内的文章列表，没找到日期就返回0
    const articleList = []
    //生成7天内的对话列表，没找到日期就返回0
    const conversationList = []
    for (let i = 6; i >= 0; i--) {  //i就是距离今天几天
        const now = new Date()
        //月份
        const month =String(now.getMonth()+1).padStart(2,'0')  //两位月份，前面补0
        //日
        const day=String(now.getDate()-i).padStart(2,'0')  //两位日，前面补0
        const date=`${month}-${day}`
        dateList.push(date)
        const aitem=articleResult.find(item=>item.day===date)
        articleList.push(aitem?aitem.articleCount:0)
        const citem=conversationResult.find(item=>item.day===date)
        conversationList.push(citem?citem.conversationCount:0)
    }
    return {
        dateList,
        articleList,
        conversationList
    }
}
module.exports = {
    totalData,
    chartData
}