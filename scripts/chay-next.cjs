// Next chỉ đọc biến PORT; repo này dùng SERVICE_PORT (trong .env.local) cho thống nhất.
// Đổi tên trước khi nạp Next. Dùng: node --env-file-if-exists=.env.local scripts/chay-next.cjs dev
if (process.env.SERVICE_PORT) process.env.PORT = process.env.SERVICE_PORT
require("next/dist/bin/next")
