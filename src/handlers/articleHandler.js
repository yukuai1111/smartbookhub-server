const { articleAdminList, articleUserList, articleDetail, addArticle,
    removeArticle, publishArticle, offlineArticle, passArticle,
    rejectArticle, updateArticle, recommendArticle, readerList,
    editorUpload
} = require('../services/articleService')
const BusinessError = require('../utils/errorHandler')
//管理员获取文章列表+分页
const adminList = async (req, res, next) => {
    try {
        const { page, pageSize, status, onlySelf } = req.valid
        const { userType, userId } = req.user
        const articleList = await articleAdminList(page, pageSize, userType, userId, onlySelf, status)
        res.ok('获取知识文章列表成功', articleList)
    } catch (err) {
        next(err)
    }
}
//普通用户获取文章列表+分页
const userList = async (req, res, next) => {
    try {
        const { page, pageSize, authorId, status } = req.valid
        //取出token
        const tokenStr = req.headers.authorization
        const articleList = await articleUserList(page, pageSize, tokenStr, authorId, status)
        res.ok('获取知识文章列表成功', articleList)
    } catch (err) {
        next(err)
    }
}

//获取文章详情
const detail = async (req, res, next) => {
    try {
        const { articleCode } = req.valid
        const tokenStr = req.headers.authorization
        const article = await articleDetail(articleCode, tokenStr)
        res.ok('获取文章详情成功', article)
    } catch (err) {
        next(err)
    }
}

//新增文章
const add = async (req, res, next) => {
    try {
        const { title, content, summary } = req.valid
        const { userId } = req.user
        let filename
        if (!req.file) filename = 'default.jpg'
        else filename = req.file.filename
        //新增文章
        const code = await addArticle(title, content, summary, filename, userId)
        res.ok('新增文章成功', code)
    } catch (err) {
        next(err)
    }
}
//文章插图
const editor = async (req, res, next) => {
    try {
        const result = await editorUpload(req.file)
       res.json({
        errno:0,
        data:result
       })
    } catch (err) {
        console.log('插图上传失败：',err)
        res.json({
            errno:1,
            message:err.message
        })
    }
}
//删除文章
const remove = async (req, res, next) => {
    try {
        const { articleCode } = req.valid
        const { userId, userType } = req.user
        //删除文章
        const code = await removeArticle(articleCode, userId, userType)
        res.ok('删除成功', code)
    } catch (err) {
        next(err)
    }
}

//上线文章
const publish = async (req, res, next) => {
    try {
        const { articleCode } = req.valid
        const { userId, userType } = req.user
        const code = await publishArticle(articleCode, userId, userType)
        if (userType === 1) {
            res.ok('上线文章成功', code)
        } else {
            res.ok('提交文章成功，请等待审核', code)
        }
    } catch (err) {
        next(err)
    }
}

//下线文章
const offline = async (req, res, next) => {
    try {
        const { articleCode, offlineReason = '' } = req.valid
        const { userId, userType } = req.user
        if (userType === 1) {
            if (!offlineReason || !offlineReason.trim()) throw new BusinessError('下线文章需要下线原因')
        }
        const code = await offlineArticle(articleCode, userId, userType, offlineReason)
        res.ok('下线文章成功', code)
    } catch (err) {
        next(err)
    }
}

//审核通过
const pass = async (req, res, next) => {
    try {
        const { articleCode } = req.valid
        const { userId, userType } = req.user
        const code = await passArticle(articleCode, userId, userType)
        res.ok('审核通过成功', code)
    } catch (err) {
        next(err)
    }
}
//审核不通过
const reject = async (req, res, next) => {
    try {
        const { articleCode, rejectReason } = req.valid
        const { userId, userType } = req.user
        const data = await rejectArticle(articleCode, userId, userType, rejectReason)
        res.ok('审核不通过成功', data)
    } catch (err) {
        next(err)
    }
}

//修改文章
const update = async (req, res, next) => {
    try {
        const { articleCode, title, content, summary } = req.valid
        const filename = req.file ? req.file.filename : ''
        const { userId } = req.user
        const code = await updateArticle(articleCode, userId, title, content, summary, filename)
        res.ok('修改文章成功', code)
    } catch (err) {
        next(err)
    }
}

//获取推荐文章
const recommend = async (req, res, next) => {
    try {
        const tokenStr = req.headers.authorization
        const articleList = await recommendArticle(tokenStr)
        res.ok('获取推荐文章成功', articleList)
    } catch (err) {
        next(err)
    }
}

//获取读者列表
const reader = async (req, res, next) => {
    try {
        const { articleCode } = req.valid
        const { userId } = req.user
        const reader = await readerList(articleCode, userId)
        res.ok('获取读者列表成功', reader)
    } catch (err) {
        next(err)
    }
}

module.exports = {
    adminList,
    userList,
    detail,
    add,
    editor,
    remove,
    publish,
    offline,
    pass,
    reject,
    update,
    recommend,
    reader
}
