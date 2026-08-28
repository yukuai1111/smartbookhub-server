const express = require('express')
const router = express.Router()
const {register,login}=require('../handlers/logRegHandler.js')
const {registerSchema,loginSchema}=require('../schemas/logRegSchma.js')
const validSchema=require('../middleWare/validateSchema.js')

//登录
router.post('/login', validSchema(loginSchema), login)


//注册
router.post('/register',validSchema(registerSchema),register)

module.exports = router

