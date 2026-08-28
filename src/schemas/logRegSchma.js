const Joi = require('joi')
//用户名校验
const username=Joi.string().trim().min(1).max(15).required().messages({
    'string.min': '用户名长度不能小于1位',
    'string.max': '用户名长度不能大于15位',
    'any.required': '用户名username不能为空',
    'string.empty': '用户名username不能为空',
    'string.base': '用户名必须是字符串',
})
//密码校验
const password=Joi.string().trim().min(6).max(15).pattern(/^[a-zA-Z0-9_@]+$/).required().messages({
    'string.min': '密码长度不能小于6位',
    'string.max': '密码长度不能大于15位',
    'any.required': '密码password不能为空',
    'string.empty': '密码password不能为空',
    'string.base': '密码必须是字符串',
    'string.pattern.base': '密码只能包含大小写字母、数字、下划线和@符号',
})

//手机号校验
const phone=Joi.string().trim().pattern(/^1[3456789]\d{9}$/).required().messages({
    'string.min': '手机号长度不能小于11位',
    'string.max': '手机号长度不能大于11位',
    'string.base': '手机号必须是字符串',
    'string.pattern.base': '手机号格式错误',
    'any.required': '手机号phone不能为空',
    'string.empty': '手机号phone不能为空',
})



//注册校验
const registerSchema=Joi.object({
    username,
    password,
    confirmPassword: password.concat(Joi.any().valid(Joi.ref('password')).messages({
        'any.required': '确认密码不能为空',
        'any.only': '两次密码不一致'
    })),
    phone
})
//登录校验
const loginSchema=Joi.object({
    account:Joi.string().trim().required().messages({
        'any.required': '账号account不能为空',
        'string.empty': '账号account不能为空',
    }),
    //密码校验
    password,
})

module.exports={
    registerSchema,
    loginSchema
}