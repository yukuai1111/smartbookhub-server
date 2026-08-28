const { customAlphabet } = require('nanoid')
const generateCode = customAlphabet('123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNPQRSTUVWXYZ', 12)
module.exports = generateCode
