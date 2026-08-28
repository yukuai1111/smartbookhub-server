const express = require('express')
const router = express.Router()
const {otherInfoSchema}=require('../schemas/userSchema.js')
const {otherInfo}=require('../handlers/userHandler.js')
const validSchema=require('../middleWare/validateSchema.js')
router.get('/otherInfo',validSchema(otherInfoSchema),otherInfo)
module.exports = router
