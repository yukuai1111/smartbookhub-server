const express = require('express')
const app = express()
const BusinessError = require('./src/utils/errorHandler.js')
const Joi = require('joi')
const multer = require('multer')
const clearTempCover = require('./src/utils/clearTempImg.js')

//引入路由
const logRegRouter = require('./src/routes/logRegRouter.js')
const articleRouter = require('./src/routes/articleRouter.js')
const frontRouter = require('./src/routes/frontRouter.js')
const commentRouter = require('./src/routes/commentRouter.js')
const adminRouter = require('./src/routes/adminRouter.js')
const userRouter = require('./src/routes/userRouter.js')

//引入中间件
const resExtend = require('./src/middleWare/resExtend.js')
const tokenMiddle = require('./src/middleWare/tokenMiddle.js')

app.use(resExtend)

//解决跨域
const cors = require('cors');
app.use(cors());

//解析请求体
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//静态资源
app.use('/images/cover', express.static('public/images/cover'))  //文章封面
app.use('/images/avatar', express.static('public/images/avatar')) //用户头像
app.use('/images/editor',express.static('public/images/editor')) //文章插图


app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
})

//挂载路由
app.use('/api/logreg', logRegRouter)      //登陆注册不需要验证token
app.use('/api/article', tokenMiddle, articleRouter)
app.use('/api/front', tokenMiddle, frontRouter)
app.use('/api/comment', tokenMiddle, commentRouter)
app.use('/api/admin', tokenMiddle, adminRouter)
app.use('/api/user', tokenMiddle, userRouter)


//处理错误
app.use((err, req, res, next) => {
  //异常先清理临时文件
  if (req._uploadFilename && req._uploadSubDir === 'cover') {
    console.log('清除封面文件', req._uploadFilename)
    clearTempCover(req._uploadFilename, 'cover')
  }
  if (req._uploadFilename && req._uploadSubDir === 'avatar') {
    console.log('清除头像文件', req._uploadFilename)
    clearTempCover(req._uploadFilename, 'avatar')
  }

  if (err instanceof BusinessError) {
    console.log('业务错误', err)
    return res.no(err.message, err.status)
  }
  //如果是校验出错
  if (err instanceof Joi.ValidationError) {
    console.log('校验出错', err)
    return res.no(err.message)
  }

  //如果是token异常
  if (err.name === 'TokenExpiredError') {
    console.log('token过期', err)
    return res.no('登陆已过期，请重新登录', 401)
  }
  if (err.name === 'JsonWebTokenError') {
    console.log('token验证失败', err)
    return res.no('登陆凭证非法，请重新登录', 401)
  }

  //上传文件错误
  if (err instanceof multer.MulterError) {
    console.log('上传文件错误', err)
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.no('表单字段名称错误，或者上传了多余文件')
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.no('文件不能超过5MB')
    }
  }

  //其他异常
  console.log('其他异常', err)
  return res.no("服务器错误", 500)
})

//使用动态端口
const PORT = process.env.PORT    //3000是默认端口，没有配置环境变量PORT时，使用3000端口（本地测试）
app.listen(PORT, () => {
  console.log('服务器启动成功')
})