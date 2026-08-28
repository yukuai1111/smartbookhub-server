const { pool } = require('../mysql/mysql.js')
const BusinessError = require('../utils/errorHandler')
const generateCode = require('../utils/generateCode')
const { filterArticle } = require('../utils/filterSensitive')
const formatNickname = require('../utils/formatNickname')
//发送评论
const addComment = async (articleCode, content, userId, replyId) => {
    let newReplyId = null
    let newRootId = null
    //查找文章
    const [articleResult] = await pool.query('select id,read_user_ids,status from articles where code=?', [articleCode])
    if (articleResult.length === 0) throw new BusinessError('文章不存在')
    const article = articleResult[0]
    //只有上线文章才可以评论（不管普通用户还是管理员）
    if (article.status !== 'published') throw new BusinessError('该文章未上线，暂无法评论')
    if (replyId) {
        //有replyId就是子评论（二级/三级....),并且子评论的根id就是回复评论的根id
        //查找这个回复的评论在不在
        const [commentResult] = await pool.query('select id,root_id,article_code,reply_id from article_comment where id=? and is_deleted=0', [replyId])
        if (commentResult.length === 0) throw new BusinessError('目标评论不存在，无法回复！')
        //获取到直接的父评论
        const parentComment = commentResult[0]
        //判断父评论的文章和此评论文章是否一致
        if (articleCode !== parentComment.article_code) throw new BusinessError('文章编码有误，无法回复！')
        //判断父评论的回复id和根id是否存在
        const replyNull = parentComment.reply_id === null
        const rootNull = parentComment.root_id === null
        //如果有一个存在一个不存在 => 报错
        if (replyNull !== rootNull)
            throw new BusinessError('目标评论数据异常，无法回复！')
        if (replyNull && rootNull) {
            //如果都不存在 => 此评论的根id和回复id都是父评论id
            newReplyId = parentComment.id
            newRootId = parentComment.id
        } else {
            //如果都存在 => 此评论的回复id是父评论id；根id是父评论的根id
            newReplyId = parentComment.id
            newRootId = parentComment.root_id
        }
    } else {
        //没有replyId就是根评论，回复id和根评论id都是null
        newReplyId = null
        newRootId = null
    }
    let id = ''
    //只尝试10次
    let retry = 10
    while (retry > 0) {
        retry--
        //生成评论编码
        id = generateCode()
        const [idResult] = await pool.query('select id from article_comment where id=? and is_deleted=0', [id])
        if (idResult.length === 0) break
    }
    //判断尝试次数还在不在
    if (retry <= 0) throw new BusinessError('生成评论编码失败，评论失败')
    const [insertResult] = await pool.query(
        'insert into article_comment (id,article_code,user_id,content,reply_id,root_id) values (?,?,?,?,?,?)',
        [id, articleCode, userId, content, newReplyId, newRootId])
    if (!insertResult.affectedRows) throw new BusinessError('评论失败')
    return { commentId: id, replyId: newReplyId, rootId: newRootId }
}
//校验评论
const checkComment = async (articleCode, userId, userType) => {
    //查找文章
    const [articleResult] = await pool.query('select id,author_id,status from articles where code=?', [articleCode])
    if (articleResult.length === 0) throw new BusinessError('文章不存在')
    const articleInfo = articleResult[0]
    //草稿的看不了
    if (articleInfo.status === 'draft') throw new BusinessError('草稿箱的文章不能操作评论')
    //待审核的看不了
    if (articleInfo.status === 'pending') throw new BusinessError('审核中的文章不能操作评论')
    //普通用户且文章下线，评论只能自己看
    if (userType === 0 && articleInfo.status === 'offline' && articleInfo.author_id !== userId) throw new BusinessError('下线的文章不对外公布评论')
    return articleInfo
}

//获取评论
const baseCommentList = async (articleCode, userId, userType, whereSql, params, totalParams, articleInfo = null) => {
    let article = articleInfo
    if (!article) {
        //没有文章信息传来，调用检查评论
        article = await checkComment(articleCode, userId, userType)
    }
    //有的话，直接接下来的操作
    let baseSql = `
        select 
        c.id commentId,
        c.article_code,
        c.content commentContent,
        c.user_id commentUserId,
        c.createTime commentCreateTime,
        c.reply_id,
        c.root_id,
    (select count(*) from article_comment where root_id=c.id) replyCount,
        u.nickname commentName,
        u.avatar commentAvatar,
        u.is_deleted commentUserIsDeleted,
        c.is_deleted commentIsDeleted,
        target_u.nickname targetName,
        target_u.id targetUserId,
        target_u.is_deleted targetUserIsDeleted,
        target_c.is_deleted targetIsDeleted
        from article_comment c
        join users u on u.id=c.user_id
        left join article_comment target_c on target_c.id=c.reply_id
        left join users target_u on target_u.id=target_c.user_id`
    const baseParams = [...params]
    if (whereSql) {
        baseSql += ` where ${whereSql}`
    }
    baseSql += ` order by replyCount desc, c.createTime desc limit ?,?`
    const [commentResult] = await pool.query(baseSql, baseParams)
    //格式化昵称
    //先找出评论人和被回复人（如果有的话）
    const collectUsers = []
    commentResult.forEach(item => {
        collectUsers.push({
            id: item.commentUserId,
            nickname: item.commentName,
            is_deleted: item.commentUserIsDeleted,
        })
        if (item.targetUserId !== null) {
            collectUsers.push({
                id: item.targetUserId,
                nickname: item.targetName,
                is_deleted: item.targetUserIsDeleted,
            })
        }
    })
    const nicknameMap = formatNickname(collectUsers)

    const commentList = commentResult.map(item => {
        return {
            ...item,
            //格式化昵称
            commentName: nicknameMap.get(item.commentUserId) ?? item.commentName,
            targetName:item.targetUserId? nicknameMap.get(item.targetUserId) ?? item.targetName:null,
            //对内容进行敏感词过滤
            commentContent: filterArticle(item.commentContent),
            commentIsDeleted: item.commentIsDeleted === 1,
            targetIsDeleted: item.targetIsDeleted === 1,
            //时间处理
            commentCreateTime: item.commentCreateTime.getTime()
        }
    })
    //总数处理
    const [totalResult] = await pool.query(`select count(*) total from article_comment c where ${whereSql}`, [...totalParams])
    return { size: commentList.length, total: totalResult[0].total, commentList }
}
//获取一级评论
const commentList = async (articleCode, userId, userType, page, pageSize) => {
    const offset = pageSize * (page - 1)
    const whereSql = `c.article_code=? and c.reply_id is null and c.root_id is null`
    const params = [articleCode, offset, pageSize]
    const result = await baseCommentList(articleCode, userId, userType, whereSql, params, [articleCode])
    return result
}
//获取一栋楼的子评论
const replyList = async (articleCode, userId, userType, rootId, page) => {
    //检查评论
    const articleInfo = await checkComment(articleCode, userId, userType)
    //查找此根评论存不存在
    const [rootResult] = await pool.query('select id,article_code,root_id,reply_id from article_comment where id=?', [rootId])
    if (rootResult.length === 0) throw new BusinessError('目标评论不存在，无法获取子评论！')
    //判断这个文章编码是不是该文章的
    if (rootResult[0].article_code !== articleCode) throw new BusinessError('文章编码有误，无法获取子评论！')
    //判断这个rootId是不是真的是根评论
    if (!(rootResult[0].root_id === null && rootResult[0].reply_id === null))
        throw new BusinessError('目标评论不是根评论，无法获取子评论！')
    //每次默认获取5条
    const offset = 5 * (page - 1)
    const whereSql = `c.article_code=? and c.root_id=?`
    const params = [articleCode, rootId, offset, 5]
    const result = await baseCommentList(articleCode, userId, userType, whereSql, params, [articleCode, rootId], articleInfo)
    return result
}

//删除评论
const removeComment = async (articleCode, userId, userType, commentId) => {
    //检查评论
    await checkComment(articleCode, userId, userType)
    //查看评论在不在
    const [commentResult] = await pool.query('select id,article_code,user_id from article_comment where id=? and is_deleted=0', [commentId])
    if (commentResult.length === 0) throw new BusinessError('评论不存在')
    const comment = commentResult[0]
    //查看评论的文章编码
    if (comment.article_code !== articleCode) throw new BusinessError('文章编码有误，无法删除评论！')
    //如果是普通用户且文章不属于自己的，无法删除别人的评论
    const isAdmin = userType === 1
    const isAuthor = comment.user_id === userId
    const isCommentUser = comment.user_id === userId
    if (!isAdmin && !isAuthor && !isCommentUser) throw new BusinessError('无法删除不属于自己的评论')
    //软删除此评论
    const [updateResult] = await pool.query('update article_comment set is_deleted=1 where id=? and article_code=?', [commentId, articleCode])
    if (updateResult.affectedRows === 0) throw new BusinessError('删除失败')
}
module.exports = {
    addComment,
    commentList,
    replyList,
    removeComment
}