const express = require('express')
const router = express.Router()
const { articleAdminListSchema, articleUserListSchema, articleDetailSchema, 
    addArticleSchema, removeArticleSchema, publishArticleSchema,offlineArticleSchema,
    passArticleSchema, rejectArticleSchema,updateArticleSchema,readerListSchema
} = require('../schemas/articleSchema')
const validateSchema = require('../middleWare/validateSchema')
const { adminList, userList, detail, add, remove, publish,offline,pass,reject,update,recommend,reader } = require('../handlers/articleHandler') 
const {uploadCover} = require('../middleWare/upload')
const attachUpload = require('../middleWare/attachUpload')
//管理员获取文章列表
router.get('/adminList', validateSchema(articleAdminListSchema), adminList)
//普通用户获取文章列表
router.get('/userList', validateSchema(articleUserListSchema), userList)

//获取文章详情
router.get('/detail', validateSchema(articleDetailSchema), detail)
//新增文章
router.post('/add',uploadCover.single('cover'),attachUpload('cover'), validateSchema(addArticleSchema), add)
//删除文章
router.delete('/remove', validateSchema(removeArticleSchema), remove)
//上线文章
router.put('/publish', validateSchema(publishArticleSchema), publish)
//下线文章
router.put('/offline', validateSchema(offlineArticleSchema), offline)
//审核通过
router.put('/pass', validateSchema(passArticleSchema), pass)
//审核不通过
router.put('/reject', validateSchema(rejectArticleSchema), reject)
//修改文章内容
router.put('/update', uploadCover.single('cover'), attachUpload('cover'), validateSchema(updateArticleSchema), update)
//获取推荐文章
router.get('/recommend',recommend)
//获取读者列表
router.get('/reader', validateSchema(readerListSchema), reader)
module.exports = router
