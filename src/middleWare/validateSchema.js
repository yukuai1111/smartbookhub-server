//检验body，params，和query参数的中间件
const validateSchema = (schema) => {
    //return才是真正的中间件
    return (req, res, next) => {
        //因为不知道要校验哪种数据，所以一起检验
        const testData={
            ...req.body,
            ...req.query,
            ...req.params
        }
        const { error, value } = schema.validate(testData,{skipUnknown:true})  //清除多余的字段
        if (error) return next(error)
        req.valid = value
        next()
    }
}
module.exports=validateSchema