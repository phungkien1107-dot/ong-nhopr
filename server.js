// Máy chủ cục bộ tối giản. Chạy: node server.js, mở http://localhost:3000.
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const files = { '/': ['index.html', 'text/html'], '/index.html': ['index.html', 'text/html'], '/styles.css': ['styles.css', 'text/css'], '/model.js': ['model.js', 'text/javascript'], '/app.js': ['app.js', 'text/javascript'] };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
  const file = files[url.pathname];
  if (!file) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Không tìm thấy trang.'); }
  fs.readFile(path.join(__dirname, file[0]), (error, body) => {
    if (error) { res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Không đọc được tệp ứng dụng.'); }
    res.writeHead(200, { 'Content-Type': file[1] + '; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(body);
  });
});
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? 'Cổng 3000 đang được sử dụng. Hãy dừng ứng dụng đang dùng cổng này rồi chạy lại.' : error.message); process.exitCode = 1; });
server.listen(3000, '0.0.0.0', () => console.log('HiveHost đang chạy tại http://localhost:3000 — Host: 0.0.0.0 — Nhấn Ctrl+C để dừng.'));
