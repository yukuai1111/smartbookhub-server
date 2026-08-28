const Joi = require('joi')
const userId=Joi.string().required().messages({
    'any.required': '用户userId不能为空',
    'string.base': '用户userId必须是字符串'
})
const otherInfoSchema=Joi.object({
    userId
})
module.exports={
    otherInfoSchema
}