const { pool } = require('../mysql/mysql.js')
const BusinessError = require('../utils/errorHandler')
const generateCode = require('../utils/generateCode')
const { checkArticle, filterArticle } = require('../utils/filterSensitive')
const path = require('path')
const fs = require('fs')
const xss = require('xss')
const getPlainText = require('../utils/getEditorText')
const formatNickname = require('../utils/formatNickname')
const jwt = require('jsonwebtoken')
require('dotenv').config()
const tokenKey = process.env.TokenKey



// 复制默认完整白名单
const myWhiteList = Object.assign({}, xss.whiteList)

// 给标签追加允许 style 属性
myWhiteList.p = ['style']
myWhiteList.span = ['style']
myWhiteList.strong = ['style']
myWhiteList.b = ['style']
myWhiteList.i = ['style']
myWhiteList.u = ['style']
myWhiteList.s = ['style']
myWhiteList.ol = ['style']
myWhiteList.ul = ['style']
myWhiteList.li = ['style']

// 创建自定义过滤器
const filterXss = new xss.FilterXSS({
    whiteList: myWhiteList,
    css: false, // 保留style里面颜色、字号
    stripIgnoreTagBody: ['script', 'noscript'] // 删除脚本内容
})


//状态和数字的映射
const statusMap = {
    1: 'draft',
    2: 'published',
    3: 'pending',
    4: 'offline',
    5: 'rejected',
}
//查询文章列表+分页（公共部分提取）
const articleBase = async (page, pageSize, whereSql, params) => {
    const offset = pageSize * (page - 1)
    const baseSql = `
    select
    id,
    code,
    author,
    author_id,
    title,
    summary,
    cover,
    createTime,
    updateTime,
    read_count,
    offline_reason,
    reject_reason,
    rejectTime,
    status,
    offlineTime
    from articles`
    let sql = baseSql
    let totalSql = `select count(*) total from articles`
    let queryParams = [...params]
    let totalParams = [...params]
    //如果有额外的条件就加入
    if (whereSql) {
        sql += ` where ${whereSql}`
        totalSql += ` where ${whereSql}`
    }
    //加入分页参数
    sql += ` order by createTime desc,id desc limit ?,?`
    queryParams.push(offset, pageSize)
    //获取数据
    const [articleResult] = await pool.query(sql, queryParams)
    const articleList = articleResult.map(item => ({
        ...item,
        createTime: item.createTime.getTime(),
        updateTime: item.updateTime.getTime(),
        rejectTime: item.rejectTime ? item.rejectTime.getTime() : null,
        offlineTime: item.offlineTime ? item.offlineTime.getTime() : null
    }))
    //获取数量
    const [totalResult] = await pool.query(totalSql, totalParams)
    const totalSize = totalResult[0].total
    return { currentSize: articleList.length, totalSize, articleList }
}
//管理员获取文章列表+分页
const articleAdminList = async (page, pageSize, userType, userId, onlySelf, status) => {
    //判断是不是管理员
    if (userType !== 1) throw new BusinessError('非管理员用户不能获取文章列表', 403)
    let whereSql = ''
    const params = []
    //管理员：选择是否只看自己
    if (onlySelf) {
        //只看自己
        whereSql = `author_id=?`
        params.push(userId)
    } else {
        //查看除了自己的文章,但草稿（别人的）看不见
        whereSql = ' status!=? and author_id!=?'
        params.push('draft', userId)
    }
    if (status) {
        //指定状态
        whereSql += ` and status=?`
        params.push(statusMap[status])
    }
    return await articleBase(page, pageSize, whereSql, params)
}
//解析token
const parseToken = (tokenStr) => {
    if (!tokenStr) return null
    const token = tokenStr.split(' ')[1]
    if (!token) return null
    try {
        const decoded = jwt.verify(token, tokenKey);
        return { userId: decoded.userId, userType: decoded.userType }
    } catch (err) {
        console.log('解析token失败', err)
        return null
    }
}
//普通用户/游客获取文章列表+分页
const articleUserList = async (page, pageSize, tokenStr, authorId, status) => {
    //判断是不是游客
    const user = parseToken(tokenStr)
    const isGuest = !user
    const userId = user?.userId
    const params = []
    let whereSql = ''
    if (isGuest) {
        //游客：只能看10篇上线文章
        whereSql += 'status=?'
        params.push(statusMap[2])
        const res = await articleBase(1, 10, whereSql, params)
        res.totalSize = res.currentSize
        res.articleList = res.articleList.map(item => {
            const { status, reject_reason, offline_reason, rejectTime, offlineTime, ...rest } = item
            return {
                ...rest,
                title: filterArticle(item.title),
                summary: filterArticle(item.summary)
            }
        })
        return res
    }

    if (authorId && authorId === userId) {
        //个人文章：自己全部状态的文章(可以选择状态，默认全部)
        if (status === 0 || !status) {
            //获取全部
            whereSql = `author_id=?`
            params.push(authorId)
        } else {
            //指定状态
            whereSql = `author_id=? and status=?`
            params.push(authorId, statusMap[status])
        }
    } else if (authorId && authorId !== userId) {
        //访问别人主页（传递authorId且authorId不等于userId）
        whereSql = `author_id=? and status=?`
        params.push(authorId, statusMap[2])
    } else {
        //公共广场：所有人已上线的文章（没有authorId）
        whereSql = `status=?`
        params.push(statusMap[2])
    }
    const res = await articleBase(page, pageSize, whereSql, params)
    //如果查看别人的文章列表才需要过滤敏感词
    res.articleList = res.articleList.map(item => {
        if (item.author_id !== userId) {
            const { status, reject_reason, offline_reason, rejectTime, offlineTime, ...rest } = item
            return {
                ...rest,
                title: filterArticle(item.title),
                summary: filterArticle(item.summary)
            }
        }
        return item
    })
    return res
}

//获取文章详情
const articleDetail = async (articleCode, tokenStr) => {
    //判断文章存不存在
    const [articleResult] = await pool.query(`
        select 
        a.id,
        a.code,
        a.status,
        a.author,
        a.author_id,
        a.title,
        a.summary,
        a.content,
        a.cover,
        a.createTime,
        a.updateTime,
        a.read_count,
        a.read_user_ids,
        a.offline_reason,
        a.reject_reason,
        a.rejectTime,
        a.offlineTime,
        count(c.id) commentCount
        from articles a 
        left join article_comment c on a.code=c.article_code
        where a.code=?
        group by a.code
`, [articleCode])
    if (articleResult.length === 0) throw new BusinessError('文章不存在')
    let article = articleResult[0]
    article.createTime = article.createTime.getTime()
    article.updateTime = article.updateTime.getTime()
    article.rejectTime = article.rejectTime ? article.rejectTime.getTime() : null
    article.offlineTime = article.offlineTime ? article.offlineTime.getTime() : null
    //判断是不是游客
    const user = parseToken(tokenStr)
    const isGuest = !user
    const userId = user?.userId
    const userType = user?.userType
    if (isGuest) {
        //游客：只能查看已上线的文章，且不记阅读量
        if (article.status !== 'published') throw new BusinessError('文章不存在')
        //过滤敏感词
        article.title = filterArticle(article.title)
        article.content = filterArticle(article.content)
        article.summary = filterArticle(article.summary)
        const { read_user_ids,offline_reason, offlineTime, reject_reason, rejectTime, ...rest } = article
        article = rest
        return article
    }
    //管理员：无法查看不是自己的草稿
    //普通用户：查看已上线/自己的文章
    if (userType === 1) {
        if (article.status === 'draft' && article.author_id !== userId) throw new BusinessError('无权查看文章', 403)
        const { read_user_ids, ...rest } = article
        article = rest
        return article
    } else if (userType === 0) {
        //如果作者不是自己且没上线，就无法查看
        if (article.author_id !== userId && article.status !== 'published') throw new BusinessError('无权查看文章', 403)
        if (article.author_id !== userId) {
            //阅读别人的文章
            //过滤敏感词
            article.title = filterArticle(article.title)
            article.content = filterArticle(article.content)
            article.summary = filterArticle(article.summary)
            //增加阅读量：如果阅读过了就不增加
            article.read_user_ids = article.read_user_ids === null ? [] : article.read_user_ids
            if (!article.read_user_ids.includes(userId)) {
                article.read_user_ids.push(userId)
                //更新数据库
                try {
                    //阅读量+1
                    await pool.query('update articles set read_count=read_count+1,read_user_ids=? where code=?', [JSON.stringify(article.read_user_ids), articleCode])

                } catch (err) {
                    console.log('增加阅读量失败', err)
                }
            }
            const { offline_reason, offlineTime, reject_reason, rejectTime, ...rest } = article
            article = rest
        }
        const { read_user_ids, ...rest } = article
        article = rest
        article.read_count++
        return article
    } else {
        throw new BusinessError('用户类型错误')
    }
}

//新增文章（存入草稿箱）
const addArticle = async (title, content, summary, filename, userId) => {
    let code = ''
    const cover = `/images/cover/${filename}`
    let retry = 10
    while (retry > 0) {
        retry--
        //生成文章编码
        code = generateCode()
        const [codeResult] = await pool.query('select code from articles where code=?', [code])
        if (codeResult.length === 0) break
    }
    //判断尝试次数还在不在
    if (retry <= 0) throw new BusinessError('生成文章编码失败，文章新增失败')
    //查找此账号的用户昵称
    const [userResult] = await pool.query('select nickname from users where id=?', [userId])
    if (userResult.length === 0) throw new BusinessError('用户不存在')

    const author = userResult[0].nickname || '匿名'
    //xss过滤
    const safeContent = filterXss.process(content)
    if (!getPlainText(safeContent).trim()) throw new BusinessError('请输入正文内容！')

    const [insertResult] = await pool.query(
        `insert into articles
        (code,title,content,summary,cover,read_user_ids,author,author_id)
        values (?,?,?,?,?,'[]',?,?)`,
        [code, title, safeContent, summary, cover, author, userId]
    )
    if (insertResult.affectedRows === 0) throw new BusinessError('新增文章失败')

    return { code }
}

//删除文章
const removeArticle = async (articleCode, userId, userType) => {
    //查找文章是否存在
    const [articleResult] = await pool.query('select code,author_id,status,cover from articles where code=?', [articleCode])
    if (articleResult.length === 0) throw new BusinessError('文章不存在')
    const article = articleResult[0]
    if (userType === 0) {
        //普通用户：删除自己的且已经下线的或是草稿
        if (article.author_id !== userId) throw new BusinessError('您没有权限删除该文章', 403)
        if (article.status === 'published') throw new BusinessError('文章已上线，请下线后删除')
        if (article.status === 'pending') throw new BusinessError('文章待审核，请联系管理员')
    } else if (userType === 1) {
        //管理员：无法删除不是自己的草稿文章
        if (article.status === 'draft' && article.author_id !== userId) throw new BusinessError('您没有权限删除该文章', 403)
    } else {
        throw new BusinessError('用户类型错误')
    }
    const [deleteResult] = await pool.query('delete from articles where code=?', [articleCode])
    if (deleteResult.affectedRows === 0) throw new BusinessError('删除文章失败')
    //删除文章成功后才删除图片（如果有的话）
    if (article.cover !== '/images/cover/default.jpg') {
        const filePath = path.join('public', article.cover)
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath)
            }
        }
        catch (err) {
            console.log('删除封面失败，请重试')
        }
    }
    return { code: articleCode }
}

//上线文章
const publishArticle = async (articleCode, userId, userType) => {
    const [articleResult] = await pool.query('select status,id,author_id,title,content,summary from articles where code=?', [articleCode])
    if (articleResult.length === 0) throw new BusinessError('文章不存在')
    const article = articleResult[0]
    //非本人无法上线
    if (article.author_id !== userId) throw new BusinessError('您没有权限操作该文章', 403)
    if (article.status === 'published') throw new BusinessError('文章已上线，无需重复操作')
    if (userType === 0) {
        //普通用户：从草稿/下线变成待审核（过滤敏感词后期审核做）
        //待审核的无法直接上线
        if (article.status === 'pending') throw new BusinessError('文章待审核，请耐心等待')
        const [updateResult] = await pool.query(`update articles set status='pending',updateTime=now() where code=?`, [articleCode])
        if (!updateResult.affectedRows) throw new BusinessError('提交文章失败')
    } else if (userType === 1) {
        //管理员：直接上线(过滤敏感词)
        if (!checkArticle(article.title)) throw new BusinessError('文章标题包含敏感词，不能上线')
        if (!checkArticle(article.content)) throw new BusinessError('文章内容包含敏感词，不能上线')
        if (!checkArticle(article.summary)) throw new BusinessError('文章摘要包含敏感词，不能上线')
        const [updateResult] = await pool.query(`update articles set status='published',updateTime=now() where code=?`, [articleCode])
        if (!updateResult.affectedRows) throw new BusinessError('上线文章失败')
    } else {
        throw new BusinessError('用户类型错误')
    }
    return { code: articleCode }
}

//下线文章
const offlineArticle = async (articleCode, userId, userType, offlineReason) => {
    const reason = userType === 1 ? offlineReason : ''
    const [articleResult] = await pool.query('select status,id,author_id from articles where code=?', [articleCode])
    if (articleResult.length === 0) throw new BusinessError('文章不存在')
    const article = articleResult[0]
    if (userType === 0) {
        //普通用户：只能下线自己的文章
        if (article.author_id !== userId) throw new BusinessError('您没有权限操作该文章', 403)
        if (article.status === 'pending') throw new BusinessError('文章待审核，请耐心等待哦~')
    } else if (userType === 1) {
        //管理员：不可以操作别人的草稿箱
        if (article.status === 'draft' && article.author_id !== userId) throw new BusinessError('您没有权限操作该文章', 403)
    } else {
        throw new BusinessError('用户类型错误')
    }
    if (article.status === 'draft') throw new BusinessError('文章还在草稿箱哦，请先上线吧~')
    if (article.status === 'offline') throw new BusinessError('文章已下线，无需重复操作')
    const [updateResult] = await pool.query(`update articles set status='offline',updateTime=now(),offline_reason=?,offlineTime=now() where code=?`, [reason, articleCode])
    if (!updateResult.affectedRows) throw new BusinessError('下线文章失败')
    return { code: articleCode }
}
//审核通过
const passArticle = async (articleCode, userId, userType) => {
    //只有管理员才可以审核
    if (userType !== 1) throw new BusinessError('暂无审核文章权限', 403)
    const [articleResult] = await pool.query('select status,id,author_id,title,content,summary,offline_reason,reject_reason from articles where code=?', [articleCode])
    if (articleResult.length === 0) throw new BusinessError('文章不存在')
    const article = articleResult[0]
    if (article.status === 'draft' && article.author_id !== userId) throw new BusinessError('您没有权限操作该文章', 403)
    if (article.status !== 'pending') {
        if (article.status === 'draft') throw new BusinessError('文章还在草稿箱哦，请先上线吧~')
        if (article.status === 'published') throw new BusinessError('文章已上线，无需重复操作')
        if (article.status === 'offline') throw new BusinessError('文章已下线，无法审核通过')
        if (article.status === 'rejected') throw new BusinessError('文章已打回，请重新申请审核~')
    }
    //查看是否有敏感词
    if (!checkArticle(article.title)) throw new BusinessError('文章标题包含敏感词，无法审核通过，请重新审核~')
    if (!checkArticle(article.content)) throw new BusinessError('文章内容包含敏感词，无法审核通过，请重新审核~')
    if (!checkArticle(article.summary)) throw new BusinessError('文章摘要包含敏感词，无法审核通过，请重新审核~')
    //更新文章状态为已上线
    const [updateResult] = await pool.query(`update articles set status='published',updateTime=now(),offline_reason=null,reject_reason=null,rejectTime=null,offlineTime=null where code=?`, [articleCode])
    if (!updateResult.affectedRows) throw new BusinessError('审核通过失败')
    return { code: articleCode }
}
//审核不通过
const rejectArticle = async (articleCode, userId, userType, rejectReason) => {
    //只有管理员才可以审核
    if (userType !== 1) throw new BusinessError('暂无审核文章权限', 403)
    const [articleResult] = await pool.query('select status,id,author_id,title,content,summary from articles where code=?', [articleCode])
    if (articleResult.length === 0) throw new BusinessError('文章不存在')
    const article = articleResult[0]
    if (article.status !== 'pending') {
        if (article.status === 'draft') throw new BusinessError('文章还在草稿箱哦，请先上线吧~')
        if (article.status === 'published') throw new BusinessError('文章已上线，无需重复操作')
        if (article.status === 'rejected') throw new BusinessError('文章已打回，无需重复操作')
        if (article.status === 'offline') throw new BusinessError('文章已下线，无需重复操作')
        throw new BusinessError('当前文章状态不支持驳回')
    }
    //查看是否有敏感词
    if (!checkArticle(article.title)) {
        rejectReason = '文章标题包含敏感词，无法通过审核，请修改后重新提交~'
    }
    else if (!checkArticle(article.content)) {
        rejectReason = '文章内容包含敏感词，无法通过审核，请修改后重新提交~'
    }
    else if (!checkArticle(article.summary)) {
        rejectReason = '文章摘要包含敏感词，无法通过审核，请修改后重新提交~'
    }
    //更新文章状态为已驳回
    const [updateResult] = await pool.query(`update articles set status='rejected',updateTime=now(),rejectTime=now(),reject_reason=? where code=?`, [rejectReason, articleCode])
    if (!updateResult.affectedRows) throw new BusinessError('审核不通过失败')

    return { code: articleCode, rejectReason }
}

//修改文章内容
const updateArticle = async (articleCode, userId, userType, title, content, summary, filename) => {
    // let autoPublish = false  //默认不自动上线
    //查找文章
    const [articleResult] = await pool.query('select id,author_id,title,content,summary,cover,status from articles where code=?', [articleCode])
    if (articleResult.length === 0) throw new BusinessError('文章不存在')

    const article = articleResult[0]
    //只能修改自己的
    if (article.author_id !== userId) throw new BusinessError('您没有权限操作该文章', 403)

    //只能修改草稿/下线/已驳回状态文章
    if (article.status === 'pending')
        throw new BusinessError('文章正在审核中，请耐心等待~')

    if (article.status === 'published') throw new BusinessError('文章已发布，请下线后修改')

    //修改文章
    let sql = `update articles set ?,updateTime=now() where code=?`
    const changeData = {}
    if (title !== undefined) changeData.title = title
    else changeData.title = article.title
    if (content !== undefined) {
        changeData.content = filterXss.process(content)
        if (!getPlainText(changeData.content).trim()) throw new BusinessError('请输入正文内容')
    }
    else changeData.content = article.content
    if (summary !== undefined) changeData.summary = summary
    else changeData.summary = article.summary
    if (filename) {
        const newCover = `/images/cover/${filename}`
        //有新图片
        //先删除旧图片
        const oldCover = path.join('public', article.cover)
        try {
            if (fs.existsSync(oldCover) && article.cover !== '/images/cover/default.jpg') {
                fs.unlinkSync(oldCover)
            }
        } catch (err) {
            console.log('清除旧图片失败', err)
        }
        //再更新
        changeData.cover = newCover
    }
    const [updateResult] = await pool.query(sql, [changeData, articleCode])
    if (!updateResult.affectedRows) throw new BusinessError('修改文章失败')
    return { code: articleCode }
}

//获取文章推荐列表
const recommendArticle = async (tokenStr) => {
    const user = parseToken(tokenStr)
    const isGuest = !user
    const userId = user?.userId
    // 上线的文章，按阅读量排序
    let sql = `select id,code,title,read_count,author,cover,status,createTime,author_id from articles where status='published' order by read_count desc,createTime desc limit `
    if (isGuest) {
        //如果是游客，只取前3条
        sql += `3`
    } else {
        //如果是普通用户，取前10条
        sql += `10`
    }
    const [articleResult] = await pool.query(sql)
    const recommendList = articleResult.map(item => {
        const {createTime,status, ...rest } = item
        item = {
            ...rest,
            createTime: createTime.getTime(),
        }
        if (item.author_id !== userId||isGuest) {
            return {
                ...item,
                title: filterArticle(item.title),
            }
        }
        return item
    })
    return { size: recommendList.length, recommendList }
}

//获取读者列表
const readerList = async (articleCode, userId) => {
    //查找文章
    const [articleResult] = await pool.query('select id,author_id,read_user_ids from articles where code=?', [articleCode])
    if (articleResult.length === 0) throw new BusinessError('文章不存在')
    const article = articleResult[0]
    //待审核无法查看
    if (article.status === 'pending') throw new BusinessError('文章正在审核中，请耐心等待~')

    //只能看自己的
    if (article.author_id !== userId) throw new BusinessError('您没有权限查看该文章的读者列表', 403)
    const readerResult = article.read_user_ids
    if (readerResult.length === 0 || !Array.isArray(readerResult)) return { size: 0, readerList: [] }
    //找到所有读者
    const [allReader] = await pool.query('select id,nickname,avatar,is_deleted from users where id in (?)', [readerResult])
    //格式化昵称
    const nicknameMap = formatNickname(allReader)
    let readerList = []
    allReader.forEach(item => {
        readerList.push({
            id: item.id,
            readerName: nicknameMap.get(item.id),
            avatar: item.avatar
        })
    })
    return { size: readerList.length, readerList }
}

module.exports = {
    articleAdminList,
    articleUserList,
    articleDetail,
    addArticle,
    removeArticle,
    publishArticle,
    offlineArticle,
    passArticle,
    rejectArticle,
    updateArticle,
    recommendArticle,
    readerList
}