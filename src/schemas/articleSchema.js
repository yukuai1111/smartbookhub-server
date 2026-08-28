const Joi=require('joi')
const page=Joi.number().integer().min(1).default(1).optional().messages({
    'number.min': '页码page不能小于1',
    'number.base': '页码page必须是整数'
})
const pageSize=Joi.number().integer().min(10).max(50).default(15).optional().messages({
    'number.min': '每页数量pageSize不能小于10',
    'number.max': '每页数量pageSize不能大于50',
    'number.base': '每页数量pageSize必须是整数'
})
//作者id
const authorId=Joi.string().trim().optional().allow(null).messages({
    'string.base': '作者authorId必须是字符串',
    'any.empty': '作者authorId不能为空'
})
//文章状态
//0：全部
//1：草稿
//2：已上线
//3：待审核
//4：下线
//5：被驳回
const status=Joi.number().integer().valid(0,1,2,3,4,5).default(0).optional().allow(null,"").messages({
    'number.base': '文章状态status必须是整数',
    'any.only': '文章状态status只能是0,1,2,3,4,5',
    'any.empty': '文章状态status不能为空'
})

//文章编码
const articleCode=Joi.string().trim().required().messages({
    'string.base': '文章编码articleCode必须是字符串',
    'any.empty': '文章编码articleCode不能为空',
    'any.required': '文章编码articleCode不能为空',
    'string.empty': '文章编码articleCode不能为空',
})

//文章标题
const title=Joi.string().trim().min(1).max(15).optional().messages({
    'string.min': '文章标题title长度不能小于1位',
    'string.max': '文章标题title长度不能大于15位',
    'string.empty': '文章标题title不能为空',
    'string.base': '文章标题title必须是字符串',
})
//文章摘要
const summary=Joi.string().trim().min(1).max(100).optional().messages({
    'string.min': '文章摘要summary长度不能小于1位',
    'string.max': '文章摘要summary长度不能大于100位',
    'string.empty': '文章摘要summary不能为空',
    'string.base': '文章摘要summary必须是字符串',
})
//文章内容
const content=Joi.string().trim().min(1).optional().messages({
    'string.min': '文章内容content长度不能小于1位',
    'string.empty': '文章内容content不能为空',
    'string.base': '文章内容content必须是字符串',
})


//管理员获取文章列表+分页参数
const articleAdminListSchema=Joi.object({
    page,
    pageSize,
    status,
    onlySelf:Joi.boolean().default(false).messages({
        'boolean.base': '是否只查看自己的草稿文章onlySelf只能是true或false',
    })
})

//普通用户获取文章列表+分页参数
const articleUserListSchema=Joi.object({
    page,
    pageSize,
    authorId,
    status
})
//获取文章详情
const articleDetailSchema=Joi.object({
    articleCode
})
//新增文章
const addArticleSchema=Joi.object({
    title,
    summary,
    content,
})
//删除文章
const removeArticleSchema=Joi.object({
    articleCode
})
//上线文章
const publishArticleSchema=Joi.object({
    articleCode
})
//下线文章
const offlineArticleSchema=Joi.object({
    articleCode,
    offlineReason:Joi.string().trim().min(1).max(100).optional().allow(null,"").messages({
        'string.min': '下线原因offlineReason长度不能小于1位',
        'string.max': '下线原因offlineReason长度不能大于100位',
        'string.empty': '下线原因offlineReason不能为空',
        'string.base': '下线原因offlineReason必须是字符串',
    })
})
//审核通过
const passArticleSchema=Joi.object({
    articleCode
})
//审核不通过
const rejectArticleSchema=Joi.object({
    articleCode,
    rejectReason:Joi.string().trim().min(1).max(100).required().messages({
        'string.min': '审核不通过原因rejectReason长度不能小于1位',
        'string.max': '审核不通过原因rejectReason长度不能大于100位',
        'any.required': '审核不通过原因rejectReason不能为空',
        'string.empty': '审核不通过原因rejectReason不能为空',
        'string.base': '审核不通过原因rejectReason必须是字符串',
    })
})
//修改文章
const updateArticleSchema=Joi.object({
    articleCode,
    title,
    summary,
    content,
})
//获取读者列表
const readerListSchema=Joi.object({
    articleCode
})
module.exports = {
    articleAdminListSchema,
    articleUserListSchema,
    articleDetailSchema,
    addArticleSchema,
    removeArticleSchema,
    publishArticleSchema,
    offlineArticleSchema,
    passArticleSchema,
    rejectArticleSchema,
    updateArticleSchema,
    readerListSchema
}
