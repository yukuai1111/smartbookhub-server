## SmartBookHub - 后端
 
### 项目介绍
 
智能知识库后台接口服务，基于 Node.js + Express + MySQL 开发，提供用户、文章、评论、AI对话、文件上传与管理员权限审核全套业务接口。
 
### 技术栈
 
- Node.js / Express
- MySQL
- JWT 身份鉴权
- Joi 参数校验
- Multer 文件上传
- SSE AI 流式响应
 
### 主要功能
 
- 用户注册登录、个人资料修改、头像上传
- 文章发布、草稿保存、提交审核、收藏管理
- 多级评论与回复功能
- AI 智能会话、流式对话、记录持久化
- 管理员文章审核、数据统计、权限管理
 
### 项目启动
```bash
 npm install
 node app.js
 ```
 
### 将  .env.example  复制为  .env ，配置数据库、密钥等环境参数。
 
### 仓库地址
- 前端：https://github.com/yukuai1111/smartbookhub-front
- 后端：https://github.com/yukuai1111/smartbookhub-server
