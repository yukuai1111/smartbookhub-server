FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制依赖（利用缓存）
COPY package*.json ./

# 安装依赖
RUN npm install --production

# 复制全部源码
COPY . .

# 后端端口
EXPOSE 3002

# 启动命令
CMD ["node", "app.js"]