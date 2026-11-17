'use strict';
const H = window.Hive;
let state = H.empty(), selectedMember = '', toastTimer;
let memberGroup = 'all', memberExtra = 'all', memberSearch = '', marketingGroup = 'new', marketingMember = '';
const groupLabels = { all: 'Tất cả', active: 'Tích cực', potential: 'Có tiềm năng', new: 'Chưa kích hoạt' };
const marketingLabels = { ...groupLabels, activated: 'Đã kích hoạt', inactive: 'Ngừng hoạt động' };
let storageError = '';
try {
  const saved = localStorage.getItem(H.KEY);
  if (saved) state = H.validate(JSON.parse(saved));
  else { state = H.demo(); localStorage.setItem(H.KEY, JSON.stringify(state)); }
}
catch { storageError = 'Không truy cập được dữ liệu lưu. Hãy kiểm tra quyền lưu trữ; dữ liệu cũ (nếu có) vẫn được giữ cho đến khi bạn chủ động nạp lại mẫu.'; }
const labels = { overview: 'Tổng quan', members: 'Thành viên', registrations: 'Đăng ký & duyệt', economics: 'Phân tích kinh tế', rules: 'Thể lệ & ưu đãi' };
const statusLabels = { pending: 'Chờ xác nhận', approved: 'Thành công', rejected: 'Không hợp lệ' };
const money = n => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
const num = n => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(n);
const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const date = s => new Date(s).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
const badge = status => `<span class="status ${status}"><i></i>${statusLabels[status]}</span>`;
function notify(message, error = false) {
  const el = document.querySelector('#notice'); clearTimeout(toastTimer); el.textContent = message; el.className = 'toast' + (error ? ' error' : ''); el.hidden = false; toastTimer = setTimeout(() => { el.hidden = true; }, 6500);
}
// Lưu thành công rồi mới thay state, tránh giao diện báo thành công khi ổ lưu trữ đầy.
function commit(action) {
  if (storageError) throw new Error(storageError + ' Nút Nạp dữ liệu mẫu có thể thay thế dữ liệu lỗi.');
  const draft = structuredClone(state); const result = action(draft);
  try { localStorage.setItem(H.KEY, JSON.stringify(draft)); } catch { throw new Error('Không lưu được dữ liệu. Hãy cho phép lưu trữ hoặc giải phóng dung lượng trình duyệt.'); }
  state = draft; return result;
}
function heading(kicker, title, description, action = '') { return `<div class="page-heading"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${description}</p></div>${action}</div>`; }
function stat(label, value, note, icon = '↗') { return `<div class="stat"><div class="stat-top">${label}<span aria-hidden="true">${icon}</span></div><strong>${value}</strong><small>${note}</small></div>`; }
function empty(text) { return `<div class="empty"><span aria-hidden="true">❋</span><p>${text}</p></div>`; }
function memberName(id) { return state.members.find(m => m.id === id)?.name || '—'; }
function transactions(rows, controls = false) {
  if (!rows.length) return empty('Chưa có giao dịch. Tạo đăng ký mới để bắt đầu.');
  return `<div class="table-wrap"><table><thead><tr><th>Khách hàng</th><th>Dịch vụ / Giá gốc</th><th>Người giới thiệu</th><th>Trạng thái</th><th>Ưu đãi đã ghi nhận</th>${controls ? '<th>Cập nhật</th>' : ''}</tr></thead><tbody>${rows.map(r => `<tr><td><strong>${escape(r.name)}</strong><small>${escape(r.email)}</small></td><td>${r.service === 'hosting' ? 'Hosting' : 'Tên miền'}<small>${money(r.price)}</small></td><td>${escape(memberName(r.referrerId))}</td><td>${badge(r.status)}</td><td>${r.status === 'approved' ? money(r.reward.direct + r.reward.customer + r.reward.tier2) : '—'}${r.status === 'approved' ? `<small>T1: ${money(r.reward.direct)} · Khách: ${money(r.reward.customer)}<br>T2: ${money(r.reward.tier2)}</small>` : ''}</td>${controls ? `<td><select aria-label="Trạng thái của ${escape(r.name)}" data-status="${escape(r.id)}">${Object.entries(statusLabels).map(([key, label]) => `<option value="${key}" ${key === r.status ? 'selected' : ''}>${label}</option>`).join('')}</select></td>` : ''}</tr>`).join('')}</tbody></table></div>`;
}
function overview() {
  const t = H.totals(state), total = t.count || 1;
  return heading('CÙNG KẾT NỐI, CÙNG PHÁT TRIỂN', 'Một tổ ong. Nhiều cơ hội.', 'Theo dõi những kết nối đang tạo nên giá trị cho cộng đồng HiveHost.', '<button class="button secondary" id="load-sample">↻ Nạp dữ liệu mẫu</button>') +
    `<section class="hero"><div><span class="pill">🐝 CHƯƠNG TRÌNH GIỚI THIỆU</span><h2>Chia sẻ một đường link,<br>lan tỏa ngàn ý tưởng.</h2><p>Mời bạn bè trải nghiệm hosting & tên miền.<br>Nhận mật ngọt khi lượt giới thiệu được duyệt.</p><a class="button dark" href="#members">Tạo mã giới thiệu <span>↗</span></a></div><div class="hero-art" aria-hidden="true"><span class="orbit o1"></span><span class="orbit o2"></span><div class="bee">🐝</div><span class="spark s1">✦</span><span class="spark s2">✧</span><div class="honey-label">Kết nối tốt đẹp<br><strong>Giá trị dài lâu</strong></div></div></section>` +
    `<div class="section-top"><h2>Bức tranh cộng đồng</h2><span class="muted">Giao dịch mô phỏng · Cập nhật tức thì</span></div><section class="stats">${stat('Thành viên', num(state.members.length), 'Người cùng xây cộng đồng', '♧')}${stat('Lượt giới thiệu', num(t.count), `${t.pending} chờ · ${t.approved} Thành công · ${t.rejected} Không hợp lệ`, '↗')}${stat('Ưu đãi thực nhận', money(t.rewards), 'Đã ghi nhận trong mô phỏng', '❋')}${stat('Doanh thu Thành công', money(t.revenue), 'Giá gốc trước ưu đãi khách mới', '◈')}</section>` +
    `<div class="grid two"><section class="panel"><div class="section-top"><h2>Hành trình giới thiệu</h2><a href="#registrations">Xem tất cả ↗</a></div><div class="status-bar">${['approved', 'pending', 'rejected'].map(k => `<span class="bar-${k}" style="width:${t[k] / total * 100}%"></span>`).join('')}</div>${['pending', 'approved', 'rejected'].map(k => `<div class="status-row">${badge(k)}<strong>${t[k]} <small>lượt</small></strong></div>`).join('')}<div class="panel-note">Chỉ lượt thành công phát sinh thưởng. Hủy duyệt sẽ hoàn tác toàn bộ ưu đãi liên quan.</div></section><section class="panel"><div class="section-top"><h2>Nhịp sống tổ ong</h2><span class="muted">Gần đây</span></div>${state.activities.length ? `<ul class="activity">${state.activities.slice(0, 5).map(a => `<li><span class="activity-dot"></span><div>${escape(a.text)}<small>${date(a.at)}</small></div></li>`).join('')}</ul>` : empty('Chưa có hoạt động. Hãy thêm thành viên hoặc nạp mẫu.')}</section></div>` +
    `<section class="bottom-note"><span aria-hidden="true">✧</span><div><strong>Rõ ràng từ mỗi lượt giới thiệu</strong><p>Dữ liệu demo tạm, chưa có dữ liệu BTC. Mọi mức thưởng đang là “Tạm tính”, có thể điều chỉnh ở Thể lệ & ưu đãi.</p></div><a href="#rules">Tìm hiểu thể lệ ↗</a></section>`;
}
function personFields() { return `<label>Họ và tên<input name="name" required minlength="2" maxlength="100" placeholder="Nguyễn Minh Anh" autocomplete="name"></label><label>Email<input name="email" type="email" required maxlength="200" placeholder="ban@example.com" autocomplete="email"></label><label>Số điện thoại <span class="muted">(không bắt buộc)</span><input name="phone" type="tel" maxlength="16" placeholder="0901234567" autocomplete="tel"></label>`; }
function members() {
  if (!selectedMember || !state.members.some(m => m.id === selectedMember)) selectedMember = state.members[0]?.id || '';
  const m = state.members.find(m => m.id === selectedMember), t = m ? H.totals(state, m.id) : null;
  const link = m ? referralLink(m.code) : '';
  return heading('CỘNG ĐỒNG HIVEHOST', 'Những người gieo kết nối', 'Tạo thành viên, chia sẻ mã và theo dõi phần thưởng từ mạng lưới của bạn.') +
    `<div class="grid form-layout"><section class="panel"><h2>Đăng ký thành viên</h2><p class="muted">Mỗi thành viên có một mã riêng, duy nhất.</p><form id="member-form">${personFields()}<label>Mã người giới thiệu <span class="muted">(nếu có)</span><input name="sponsor" maxlength="30" placeholder="HIVE-XXXXXXXX"><small>Người này nhận thưởng tầng hai khi bạn giới thiệu khách hợp lệ.</small></label><button class="button" type="submit">Tạo thành viên & mã ↗</button><p class="form-feedback" role="status"></p></form></section><section class="panel"><div class="section-top"><h2>Hồ sơ thành viên</h2><span class="pill">${state.members.length} thành viên</span></div>${m ? `<label>Chọn thành viên<select id="member-select">${state.members.map(member => `<option value="${escape(member.id)}" ${member.id === m.id ? 'selected' : ''}>${escape(member.name)} · ${escape(member.code)}</option>`).join('')}</select></label><div class="profile"><div class="avatar">${escape(m.name.slice(0, 1))}</div><div><h3>${escape(m.name)}</h3><p>${escape(m.email)}${m.phone ? ' · ' + escape(m.phone) : ''}</p><small>Người giới thiệu: ${escape(memberName(m.sponsorId))}</small></div></div><div class="referral-box"><span>MÃ GIỚI THIỆU</span><div><strong>${escape(m.code)}</strong><button class="button secondary small" data-copy="${escape(m.code)}">Copy mã</button></div><label>Link đăng ký<input readonly value="${escape(link)}" aria-label="Link giới thiệu"></label><button class="text-button" data-copy="${escape(link)}">Copy link giới thiệu ↗</button></div><div class="mini-stats">${stat('Khách trực tiếp', num(t.count), `${t.approved} Thành công`)}${stat('Tổng thưởng thành viên', money(t.rewards), `Tầng 1: ${money(t.direct)} · Tầng 2: ${money(t.tier2)}`)}</div><p class="panel-note">Tổng thưởng thành viên gồm tầng 1 + tầng 2, không bao gồm ưu đãi khách mới. ${t.pending} Chờ xác nhận · ${t.rejected} Không hợp lệ.</p>` : empty('Thêm thành viên đầu tiên để có mã giới thiệu.')}</section></div>${m ? `<section class="panel spaced"><h2>Khách do ${escape(m.name)} giới thiệu</h2>${transactions(state.registrations.filter(r => r.referrerId === m.id))}<h3 class="spaced">Thưởng tầng hai</h3>${secondTier(m.id)}</section>` : ''}`;
}
function secondTier(memberId) {
  const rows = state.registrations.filter(r => r.status === 'approved' && r.reward.tier2Id === memberId);
  return rows.length ? `<ul class="reward-list">${rows.map(r => `<li><span>${escape(r.name)} <small>qua ${escape(memberName(r.referrerId))}</small></span><strong>${money(r.reward.tier2)}</strong></li>`).join('')}</ul>` : '<p class="muted">Chưa có thưởng tầng hai được ghi nhận.</p>';
}
function registrations() {
  const requestedRef = new URLSearchParams(location.search).get('ref') || '';
  const ref = H.memberByCode(state, requestedRef)?.code || '';
  return heading('TỪ KẾT NỐI ĐẾN GIÁ TRỊ', 'Đăng ký & duyệt', 'Đăng ký dịch vụ mô phỏng. Duyệt hợp lệ để ghi nhận ưu đãi cho cả mạng lưới.') +
    `<div class="grid form-layout"><section class="panel"><h2>Đăng ký dịch vụ</h2><form id="registration-form">${personFields()}<label>Dịch vụ<select name="service"><option value="hosting">Hosting · ${money(state.config.hosting)} (Tạm tính)</option><option value="domain">Tên miền · ${money(state.config.domain)} (Tạm tính)</option></select></label><label>Mã giới thiệu<input id="referral-code" name="code" required maxlength="30" placeholder="HIVE-XXXXXXXX" value="${escape(ref)}"><small id="code-feedback">Nhập mã từ một thành viên HiveHost.</small></label><button class="button" type="submit">Gửi đăng ký mô phỏng ↗</button><p class="form-feedback" role="status"></p></form></section><section class="panel process-panel"><span class="eyebrow">MỘT QUY TRÌNH MINH BẠCH</span><h2>Ba bước nhận mật ngọt</h2><ol class="steps"><li><b>01</b><div><h3>Chia sẻ kết nối</h3><p>Thành viên gửi mã hoặc link riêng cho khách mới.</p></div></li><li><b>02</b><div><h3>Kiểm tra & duyệt</h3><p>Mã phải tồn tại; không trùng khách, tự giới thiệu hoặc tạo vòng thưởng.</p></div></li><li><b>03</b><div><h3>Ghi nhận ưu đãi</h3><p>Chỉ trạng thái Thành công được tính thưởng. Đổi sang trạng thái khác sẽ hoàn tác.</p></div></li></ol><div class="panel-note">Giá dịch vụ được lưu lúc đăng ký. Mức thưởng chốt khi duyệt lần đầu; duyệt lại dùng đúng mức đã chốt. Không có thu tiền hay cung cấp hosting thật.</div></section></div><section class="panel spaced"><div class="section-top"><h2>Danh sách đăng ký</h2><label class="inline-label">Lọc trạng thái <select id="status-filter"><option value="all">Tất cả (${state.registrations.length})</option>${Object.entries(statusLabels).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label></div><div id="registration-table">${transactions([...state.registrations].reverse(), true)}</div></section>`;
}
function chart(rows) {
  const max = Math.max(1, ...rows.map(r => r.revenueTotal), ...rows.map(r => r.costTotal));
  const x = i => 65 + i * 59, y = n => 225 - n / max * 185;
  return `<div class="chart-wrap"><svg viewBox="0 0 760 280" role="img" aria-label="Biểu đồ dự phóng 12 tháng: doanh thu lũy kế và chi phí ưu đãi lũy kế"><title>Dự phóng kinh tế theo tháng, đơn vị triệu đồng</title>${[0, 1, 2, 3, 4].map(i => { const value = max * i / 4; return `<line x1="65" y1="${y(value)}" x2="714" y2="${y(value)}" stroke="#e9e1d3"/><text x="55" y="${y(value) + 4}" text-anchor="end">${num(value / 1e6)}</text>`; }).join('')}<text x="12" y="20">triệu đ</text><polyline fill="none" stroke="#d69a16" stroke-width="3" points="${rows.map((r, i) => x(i) + ',' + y(r.revenueTotal)).join(' ')}"/><polyline fill="none" stroke="#74856a" stroke-width="3" stroke-dasharray="6 4" points="${rows.map((r, i) => x(i) + ',' + y(r.costTotal)).join(' ')}"/>${rows.map((r, i) => `<circle cx="${x(i)}" cy="${y(r.revenueTotal)}" r="4" fill="#d69a16"><title>Tháng ${r.month}: doanh thu ${money(r.revenueTotal)}, chi phí ${money(r.costTotal)}</title></circle><text x="${x(i)}" y="252" text-anchor="middle">T${r.month}</text>`).join('')}</svg></div><div class="chart-legend"><span><i class="revenue-dot"></i>Doanh thu lũy kế</span><span><i class="cost-dot"></i>Chi phí ưu đãi lũy kế</span></div>`;
}
function economicResults() {
  const rows = H.project(state), last = rows[11];
  return `<section class="stats">${stat('Khách mới / tháng', num(rows[0].newCustomers), 'Kỳ vọng, có thể là số thập phân')}${stat('Doanh thu 12 tháng', money(last.revenueTotal), 'Dự phóng · Thu định kỳ hàng tháng')}${stat('Chi phí ưu đãi 12 tháng', money(last.costTotal), 'Dự phóng · Trả một lần / khách')}${stat('Doanh thu / Chi phí', last.ratio === null ? 'Không xác định' : num(last.ratio) + ' lần', 'Không phải tỷ suất lợi nhuận')}</section><section class="panel"><div class="section-top"><h2>Mật ngọt qua từng tháng</h2><span class="pill">DỰ PHÓNG · 12 THÁNG</span></div>${chart(rows)}<details><summary>Xem bảng số liệu và đơn vị</summary><div class="table-wrap"><table><thead><tr><th>Tháng</th><th>Khách mới</th><th>Khách tích lũy</th><th>Doanh thu tháng (đ)</th><th>Ưu đãi tháng (đ)</th><th>DT lũy kế (đ)</th><th>CP lũy kế (đ)</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r.month}</td><td>${num(r.newCustomers)}</td><td>${num(r.active)}</td><td>${money(r.revenue)}</td><td>${money(r.cost)}</td><td>${money(r.revenueTotal)}</td><td>${money(r.costTotal)}</td></tr>`).join('')}</tbody></table></div></details></section>`;
}
function economics() {
  const a = state.assumptions;
  return heading('NHÌN XA HƠN MỖI LƯỢT GIỚI THIỆU', 'Bài toán tăng trưởng', 'Dự phóng độc lập với giao dịch mô phỏng. Thay giả định để khám phá hiệu quả kinh tế.') +
    `<p class="muted">Giá dịch vụ tạm tính: Hosting ${money(state.config.hosting)}/gói; tên miền ${money(state.config.domain)}/tên miền. Chỉnh sửa tại <a href="#rules">Thể lệ & ưu đãi</a>. Giá giao dịch này không thay giả định doanh thu/khách/tháng (P) bên dưới.</p><p class="muted">Ưu đãi tạm tính dùng trong dự phóng (đồng/khách mới): T1 (người giới thiệu) = ${money(state.config.direct)}; K (khách mới) = ${money(state.config.customer)}; T2 (người giới thiệu của thành viên) = ${money(state.config.tier2)}.</p>` +
    `<section class="panel"><div class="section-top"><h2>Bốn giả định đầu vào</h2><span class="pill">Tạm tính · Chưa đối chiếu đề BTC</span></div><form id="economics-form" class="assumption-grid">${[['members', 'Thành viên tham gia', 'người', 1000000, 1], ['referrals', 'Lượt giới thiệu / người / tháng', 'lượt', 1000000, 'any'], ['conversion', 'Tỷ lệ chuyển đổi', '%', 100, 'any'], ['revenue', 'Doanh thu / khách / tháng', 'đồng', 1000000000, 'any']].map(([key, label, unit, max, step]) => `<label>${label}<div class="input-unit"><input type="number" name="${key}" min="0" max="${max}" step="${step}" required value="${a[key]}"><span>${unit}</span></div></label>`).join('')}<p class="form-feedback" role="status"></p></form></section><div id="economic-results" class="spaced">${economicResults()}</div><section class="panel spaced"><h2>Công thức & phạm vi giả định</h2><div class="formula-grid"><div><strong>Khách mới mỗi tháng = N × R × C / 100</strong><p>N: thành viên; R: lượt giới thiệu/người/tháng; C: tỷ lệ chuyển đổi (%).</p><strong>Doanh thu tháng t = Khách mới × t × P</strong><p>P: doanh thu/khách/tháng (đ). Khách trả tiền ngay từ tháng đầu, duy trì đủ 12 tháng, không có rời bỏ.</p></div><div><strong>Chi phí tháng = Khách mới × (T1 + K + T2)</strong><p>Ưu đãi trả một lần khi có khách mới. Giả định mọi khách đều có đủ hai tầng, dùng toàn bộ mức ưu đãi cấu hình để dự toán chi phí thận trọng.</p><strong>Tỷ lệ = Tổng doanh thu / Tổng chi phí ưu đãi</strong><p>Nếu chi phí bằng 0, tỷ lệ không xác định. Chưa tính vận hành, thuế, hoàn tiền; không phải lợi nhuận. Giá dịch vụ ở tab Thể lệ dùng cho giao dịch, không thay P ở đây.</p></div></div></section>`;
}
function rules() {
  return heading('RÕ RÀNG ĐỂ CÙNG PHÁT TRIỂN', 'Thể lệ & ưu đãi', 'Một chương trình dễ hiểu, minh bạch cho thành viên và khách hàng mới.', '<button class="button secondary" id="copy-summary">⧉ Copy tóm tắt</button>') +
    `<div class="grid two"><section class="panel"><div class="section-top"><h2>Cấu hình chương trình</h2><span class="pill">Tạm tính</span></div><p class="muted">Các mức dưới đây do bạn quyết định, chưa phải mức thưởng đã chốt với BTC.</p><form id="config-form">${[['hosting', 'Giá gói Hosting (đ/gói)'], ['domain', 'Giá tên miền (đ/tên miền)'], ['direct', 'Thưởng người giới thiệu · Tầng 1 (đ/khách)'], ['customer', 'Ưu đãi khách mới (đ/khách)'], ['tier2', 'Thưởng người giới thiệu của thành viên · Tầng 2 (đ/khách)']].map(([key, label]) => `<label>${label}<input name="${key}" type="number" min="0" max="1000000000" step="1" required value="${state.config[key]}"></label>`).join('')}<button class="button" type="submit">Lưu mức tạm tính</button><p class="form-feedback" role="status"></p></form><p class="panel-note">Ưu đãi khách mới không vượt giá gốc giao dịch. Đổi mức chỉ ảnh hưởng đăng ký mới (giá) và giao dịch chưa từng duyệt (thưởng). Thưởng đã duyệt giữ nguyên.</p></section><section class="panel"><span class="eyebrow">NGUYÊN TẮC CÙNG CHƠI</span><h2>Thưởng đúng, kết nối bền</h2><ol class="rules-list"><li><strong>Mã hợp lệ, khách hàng mới</strong><p>Mã thuộc thành viên đã đăng ký. Mỗi email hoặc số điện thoại chỉ có một giao dịch, kể cả bị từ chối; có thể duyệt lại giao dịch cũ.</p></li><li><strong>Hai tầng, không hơn</strong><p>A mời B làm thành viên; B mời khách C đăng ký dịch vụ. B nhận T1, A nhận T2 và C nhận ưu đãi khách mới khi hợp lệ.</p></li><li><strong>Không tự giới thiệu hay tạo vòng</strong><p>Chặn email/số điện thoại trùng người hưởng thưởng T1 hoặc T2. Gộp bí danh Gmail có dấu chấm hoặc hậu tố +. Người giới thiệu của thành viên được gắn khi tạo và không đổi.</p></li><li><strong>Duyệt mới ghi nhận</strong><p>Chờ xác nhận và Không hợp lệ không tạo thưởng. Duyệt nhiều lần không cộng trùng; hủy duyệt hoàn tác T1, T2 và ưu đãi khách.</p></li><li><strong>Mô phỏng có giới hạn</strong><p>Không đăng nhập, xác thực danh tính hoặc chuyển tiền thật. localStorage chỉ lưu trên trình duyệt hiện tại; dữ liệu có thể mất khi xóa bộ nhớ trình duyệt.</p></li></ol></section></div>`;
}
function referralLink(code) { const url = new URL(location.href); url.search = ''; url.searchParams.set('ref', code); url.hash = 'registrations'; return url.href; }
function render() {
  // Chỉ nhận đúng 5 tab; các hash như #__proto__ cũng quay về Tổng quan.
  const tab = location.hash.slice(1) || 'overview', active = Object.hasOwn(labels, tab) ? tab : 'overview';
  document.querySelector('#breadcrumb').textContent = labels[active];
  document.querySelectorAll('[data-tab]').forEach(el => { el.classList.toggle('active', el.dataset.tab === active); if (el.dataset.tab === active) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); });
  document.querySelector('#pending-count').textContent = H.totals(state).pending;
  document.querySelector('#main').innerHTML = (storageError ? `<div class="storage-warning" role="alert">${escape(storageError)}</div>` : '') + ({ overview, members, registrations, economics, rules })[active]();
  enhance(active);
  if (active === 'registrations') checkCode();
}
function checkCode() {
  const input = document.querySelector('#referral-code'); if (!input) return;
  const m = H.memberByCode(state, input.value), el = document.querySelector('#code-feedback');
  el.textContent = !input.value.trim() ? 'Nhập mã từ một thành viên HiveHost.' : m ? '✓ Mã của ' + m.name : 'Mã chưa tồn tại. Kiểm tra mã hoặc tạo thành viên trước.';
  el.className = m ? 'valid-text' : input.value.trim() ? 'invalid-text' : '';
}
async function copy(text) {
  try { if (!navigator.clipboard?.writeText) throw new Error(); await navigator.clipboard.writeText(text); notify('Đã copy vào bộ nhớ tạm.'); }
  catch {
    const area = document.createElement('textarea'); area.value = text; area.style.position = 'fixed'; area.style.opacity = '0'; document.body.append(area); area.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch {} area.remove();
    if (ok) notify('Đã copy vào bộ nhớ tạm.'); else { const dialog = document.createElement('dialog'); const title = document.createElement('h2'); title.textContent = 'Trình duyệt chưa cho phép copy'; const field = document.createElement('textarea'); field.value = text; field.readOnly = true; field.rows = 10; const close = document.createElement('button'); close.className = 'button'; close.textContent = 'Đóng'; close.onclick = () => { dialog.close(); dialog.remove(); }; dialog.append(title, field, close); document.body.append(dialog); dialog.showModal(); field.focus(); field.select(); notify('Hãy chọn nội dung và dùng Ctrl+C hoặc thao tác Sao chép trên điện thoại.', true); }
  }
}
document.addEventListener('submit', event => {
  const form = event.target;
  if (form.id === 'economics-form') { event.preventDefault(); return; }
  if (!['member-form', 'registration-form', 'config-form'].includes(form.id)) return; event.preventDefault();
  const input = Object.fromEntries(new FormData(form));
  try {
    if (form.id === 'member-form') {
      if (!input.password || input.password !== input.confirmPassword) throw new Error('Mật khẩu và xác nhận mật khẩu phải được nhập và trùng khớp.');
      delete input.password; delete input.confirmPassword;
      const m = commit(s => H.addMember(s, input)); selectedMember = m.id; notify('Đã tạo thành viên và mã ' + m.code + '.'); }
    if (form.id === 'registration-form') { commit(s => H.addRegistration(s, input)); notify('Đã gửi đăng ký. Trạng thái: Chờ xác nhận.'); }
    if (form.id === 'config-form') { commit(s => H.configure(s, input)); notify('Đã lưu mức tạm tính. Các khoản thưởng đã chốt được giữ nguyên.'); }
    render();
  } catch (error) { form.querySelector('.form-feedback').textContent = error.message; notify(error.message, true); }
});
document.addEventListener('change', event => {
  const el = event.target;
  if (el.id === 'member-select') { selectedMember = el.value; render(); }
  if (el.id === 'status-filter') { document.querySelector('#registration-table').innerHTML = transactions([...state.registrations].reverse().filter(r => el.value === 'all' || r.status === el.value), true); installExports(); }
  if (el.dataset.status) {
    const filter = document.querySelector('#status-filter').value;
    try { commit(s => H.setStatus(s, el.dataset.status, el.value)); render(); document.querySelector('#status-filter').value = filter; document.querySelector('#status-filter').dispatchEvent(new Event('change', { bubbles: true })); notify('Đã cập nhật trạng thái và toàn bộ thống kê, ưu đãi liên quan.'); }
    catch (error) { render(); notify(error.message, true); }
  }
});
document.addEventListener('input', event => {
  if (event.target.id === 'referral-code') checkCode();
  if (event.target.closest('#economics-form')) {
    const form = document.querySelector('#economics-form'), feedback = form.querySelector('.form-feedback');
    if (!form.checkValidity()) { feedback.textContent = 'Vui lòng điền đủ 4 giá trị hợp lệ. Biểu đồ đang giữ kết quả hợp lệ gần nhất.'; return; }
    try { commit(s => H.assumptions(s, Object.fromEntries(new FormData(form)))); feedback.textContent = 'Đã lưu giả định. Kết quả cập nhật bên dưới.'; document.querySelector('#economic-results').innerHTML = economicResults(); installExports(); }
    catch (error) { feedback.textContent = error.message; }
  }
});
document.addEventListener('click', event => {
  const el = event.target.closest('button'); if (!el) return;
  if (el.dataset.copy) copy(el.dataset.copy);
  if (el.id === 'load-sample') document.querySelector('#sample-dialog').showModal();
  if (el.id === 'cancel-sample') document.querySelector('#sample-dialog').close();
  if (el.id === 'confirm-sample') {
    try { const sample = H.demo(); sample.pinnedTemplates = [...(state.pinnedTemplates || [])]; localStorage.setItem(H.KEY, JSON.stringify(sample)); state = sample; storageError = ''; selectedMember = ''; document.querySelector('#sample-dialog').close(); render(); notify('Đã nạp bộ dữ liệu demo tạm, chưa phải dữ liệu BTC.'); }
    catch { notify('Không lưu được dữ liệu mẫu. Hãy kiểm tra quyền và dung lượng lưu trữ.', true); }
  }
  if (el.id === 'copy-summary') copy(`CHƯƠNG TRÌNH GIỚI THIỆU HIVEHOST — TẠM TÍNH\nHosting: ${money(state.config.hosting)}/gói; Tên miền: ${money(state.config.domain)}/tên miền.\nThưởng tầng 1: ${money(state.config.direct)}/khách; ưu đãi khách mới: ${money(state.config.customer)}/khách (không vượt giá giao dịch); thưởng tầng 2: ${money(state.config.tier2)}/khách nếu có.\nA mời B làm thành viên; B mời khách C: B nhận tầng 1, A nhận tầng 2, C nhận ưu đãi. Chỉ giao dịch Thành công ghi nhận thưởng; hủy duyệt hoàn tác, duyệt lại không cộng trùng và giữ mức đã chốt.\nKhông tự giới thiệu, giới thiệu vòng hoặc trùng email/số điện thoại. Gộp bí danh Gmail. Mỗi khách chỉ một giao dịch kể cả bị từ chối.\nGiá chốt khi đăng ký, thưởng chốt lúc duyệt đầu tiên. Mức tạm tính do người dùng cấu hình, chưa được BTC chốt. Ứng dụng chỉ mô phỏng, lưu cục bộ, không thanh toán hay xác thực danh tính thật.`);
});
// Dùng cùng một bộ lọc cho màn hình và dữ liệu xuất.
function filteredMembers(group = memberGroup, extra = memberExtra, query = memberSearch) {
  const now = Date.now(), q = query.trim().toLocaleLowerCase('vi-VN');
  return state.members.filter(m => {
    const s = H.segment(state, m, now);
    return (group === 'all' || s.group === group) && (extra === 'all' || s[extra]) && (!q || [m.name,m.email,m.phone,m.memberCode,m.code].some(v => String(v || '').toLocaleLowerCase('vi-VN').includes(q)));
  });
}
function directoryRows(rows) {
  return rows.length ? `<div class="table-wrap"><table><thead><tr><th>Thành viên / Mã</th><th>Email</th><th>Điện thoại</th><th>Nhóm chính</th><th>Hoạt động</th><th>Lượt giới thiệu</th><th>Tổng thưởng (đ)</th></tr></thead><tbody>${rows.map(m => {
    const s = H.segment(state,m), t = H.totals(state,m.id);
    return `<tr><td><button type="button" class="text-button" data-profile="${escape(m.id)}">${escape(m.name)}</button><small>${escape(m.memberCode)}</small></td><td>${escape(m.email)}</td><td>${escape(m.phone || 'Chưa có (dữ liệu cũ)')}</td><td>${groupLabels[s.group]}</td><td>${s.activated ? 'Đã kích hoạt' : 'Chưa kích hoạt'}${s.inactive ? ' · Ngừng hoạt động' : ''}<small>${s.latest ? date(s.latest) : 'Chưa từng giới thiệu'}</small></td><td>${t.count}<small>${t.approved} Thành công · ${t.pending} Chờ xác nhận · ${t.rejected} Không hợp lệ</small></td><td>${money(t.rewards)}</td></tr>`;
  }).join('')}</tbody></table></div>` : empty('Không có thành viên khớp bộ lọc và tìm kiếm.');
}
function directory() {
  return `<section class="panel spaced" id="member-directory"><h2>Danh sách & phân khúc thành viên</h2><div class="assumption-grid"><label>Nhóm chính<select id="group-filter">${Object.entries(groupLabels).map(([v,l])=>`<option value="${v}" ${v===memberGroup?'selected':''}>${l}</option>`).join('')}</select></label><label>Hoạt động bổ sung<select id="extra-filter">${[['all','Tất cả'],['activated','Đã kích hoạt'],['inactive','Ngừng hoạt động ≥ 30 ngày']].map(([v,l])=>`<option value="${v}" ${v===memberExtra?'selected':''}>${l}</option>`).join('')}</select></label><label>Tìm thành viên<input id="member-search" type="search" value="${escape(memberSearch)}" placeholder="Tên, email, điện thoại, mã"></label></div><p class="muted">Ba nhóm chính không trùng nhau. Ngừng hoạt động: từng giới thiệu, không có lượt mới trong 30 ngày gần nhất; vẫn giữ nhóm chính.</p><p id="directory-caption" class="muted"></p><div id="directory-rows">${directoryRows(filteredMembers())}</div></section>`;
}
function updateDirectory() {
  document.querySelector('#directory-rows').innerHTML = directoryRows(filteredMembers());
  document.querySelector('#directory-caption').textContent = `${groupLabels[memberGroup]} · ${memberExtra === 'all' ? 'Mọi hoạt động' : memberExtra === 'inactive' ? 'Ngừng hoạt động' : 'Đã kích hoạt'} · Tìm: ${memberSearch || '(không)'} · ${filteredMembers().length}/${state.members.length} thành viên`;
}
function messageTemplates(m) {
  const hello = m ? `Chào ${m.name},` : 'Chào bạn,', referral = m ? ` Mã giới thiệu của bạn: ${m.code}. Link: ${referralLink(m.code)}.` : ' Chọn một thành viên cụ thể để chèn mã/link cá nhân.';
  return [
    {id:'active',title:'Tích cực · Duy trì kết nối',text:`${hello} cảm ơn bạn đã có lượt giới thiệu Thành công cùng HiveHost! Hãy tiếp tục chia sẻ dịch vụ với người phù hợp.${referral} Ưu đãi đang là mức tạm tính, chỉ ghi nhận khi Thành công.`},
    {id:'potential',title:'Có tiềm năng · Hỗ trợ chuyển đổi',text:`${hello} HiveHost đã ghi nhận các lượt giới thiệu của bạn. Bạn có thể kiểm tra trạng thái và hỗ trợ khách hoàn thiện thông tin.${referral} Chưa Thành công thì chưa phát sinh thưởng.`},
    {id:'new',title:'Chưa kích hoạt · Bắt đầu giới thiệu',text:`${hello} mời bạn bắt đầu kết nối cùng HiveHost! Chia sẻ mã/link cho khách mới quan tâm hosting hoặc tên miền.${referral} Xem thể lệ và mức ưu đãi tạm tính trước khi giới thiệu.`},
    {id:'inactive',title:'Ngừng hoạt động · Kết nối lại',text:`${hello} đã lâu bạn chưa có lượt giới thiệu mới. HiveHost sẵn sàng cùng bạn kết nối trở lại.${referral} Hãy kiểm tra chương trình tạm tính hiện tại trước khi chia sẻ.`}
  ];
}
function marketingContent() {
  const extra = ['activated','inactive'].includes(marketingGroup) ? marketingGroup : 'all';
  const rows = filteredMembers(extra==='all'?marketingGroup:'all', extra, ''), m = rows.find(x=>x.id===marketingMember);
  const relevant = messageTemplates(m).filter(t=>t.id===marketingGroup || marketingGroup==='all' || marketingGroup==='activated' || state.pinnedTemplates.includes(t.id)).sort((a,b)=>Number(state.pinnedTemplates.includes(b.id))-Number(state.pinnedTemplates.includes(a.id)));
  return `<label>Thành viên cụ thể<select id="marketing-member"><option value="">Mẫu chung cho nhóm</option>${rows.map(x=>`<option value="${escape(x.id)}" ${x.id===m?.id?'selected':''}>${escape(x.name)} · ${escape(x.memberCode)}</option>`).join('')}</select></label><p class="muted">Danh sách tiếp cận: ${marketingLabels[marketingGroup]} · ${rows.length} thành viên. Chỉ tạo và sao chép, không gửi email/SMS. Link chỉ nhận diện mã có trong dữ liệu của trình duyệt nhận.</p><div id="outreach-list">${directoryRows(rows)}</div>${relevant.map(t=>`<article class="message-card"><h3>${escape(t.title)}</h3><p class="message-content">${escape(t.text)}</p><div class="actions"><button type="button" class="button secondary small" data-pin="${t.id}" aria-pressed="${state.pinnedTemplates.includes(t.id)}">${state.pinnedTemplates.includes(t.id)?'Bỏ ghim':'Ghim'} mẫu</button><button type="button" class="button secondary small" data-copy="${escape(t.text)}">Sao chép tin nhắn</button></div></article>`).join('')}`;
}
function enhance(active) {
  if (active === 'overview') {
    const totalValue = document.querySelector('.stats .stat > strong');
    if (totalValue) totalValue.innerHTML = `<button type="button" class="text-button" data-group="all">${num(state.members.length)} ↗</button>`;
    const now = Date.now(), groups = Object.entries(groupLabels).filter(([k])=>k!=='all');
    const cards = groups.map(([key,label])=>`<div class="stat"><div class="stat-top">${label}</div><strong><button type="button" class="text-button" data-group="${key}">${state.members.filter(m=>H.segment(state,m,now).group===key).length} người ↗</button></strong><small>Mở danh sách đã lọc</small></div>`).join('') + ['activated','inactive'].map(key=>`<div class="stat"><div class="stat-top">${marketingLabels[key]}</div><strong><button type="button" class="text-button" data-extra-group="${key}">${state.members.filter(m=>H.segment(state,m,now)[key]).length} người ↗</button></strong><small>Bộ lọc bổ sung, có giao với nhóm chính</small></div>`).join('');
    document.querySelector('#main').insertAdjacentHTML('beforeend',`<section class="stats spaced" aria-label="Phân khúc thành viên">${cards}</section>`);
  }
  if (active === 'members') {
    const form = document.querySelector('#member-form'), phone = form.elements.phone;
    phone.required = true; phone.closest('label').querySelector('.muted')?.remove();
    form.querySelector('[name="sponsor"]').closest('label').insertAdjacentHTML('beforebegin','<label>Mật khẩu mô phỏng<input type="password" name="password" required autocomplete="new-password"></label><label>Xác nhận mật khẩu<input type="password" name="confirmPassword" required autocomplete="new-password"><small>Chỉ kiểm tra trùng khớp, loại bỏ sau khi gửi; không dùng đăng nhập và không lưu mật khẩu.</small></label>');
    const m = state.members.find(x=>x.id===selectedMember);
    if (m) document.querySelector('.profile').insertAdjacentHTML('afterend',`<p class="muted">Mã thành viên: ${escape(m.memberCode)} <button type="button" class="button secondary small" data-copy="${escape(m.memberCode)}">Sao chép</button></p>`);
    document.querySelector('#main').insertAdjacentHTML('beforeend', directory()+`<section class="panel spaced" id="marketing"><h2>Công cụ Marketing</h2><label>Nhóm tiếp cận<select id="marketing-group">${Object.entries(marketingLabels).map(([k,l])=>`<option value="${k}" ${k===marketingGroup?'selected':''}>${l}</option>`).join('')}</select></label><div id="marketing-content">${marketingContent()}</div></section>`);
    updateDirectory();
  }
  if (active === 'registrations') {
    const code = document.querySelector('#referral-code');
    code.closest('label').insertAdjacentHTML('beforebegin',`<label>Giá dịch vụ giả định (đ/gói)<input id="service-price" readonly value="${money(state.config.hosting)}"></label>`);
    const requested = new URLSearchParams(location.search).get('ref');
    if (requested && !H.memberByCode(state, requested)) code.closest('label').insertAdjacentHTML('afterend','<p class="invalid-text">Mã trong link chưa có trên trình duyệt này. Dữ liệu không tự đồng bộ giữa thiết bị; hãy dùng mã thành viên đã tồn tại tại đây.</p>');
  }
  installExports();
}
// Mọi bảng/kết quả đi qua cùng cơ chế lấy dữ liệu và thao tác xuất.
function snapshot(region) {
  const clone = region.cloneNode(true);
  clone.querySelectorAll('.export-actions, .actions, script, .form-feedback').forEach(n=>n.remove());
  clone.querySelectorAll('button').forEach(n=>n.replaceWith(document.createTextNode(n.textContent.replace(/\s*↗$/, ''))));
  clone.querySelectorAll('input,select,textarea').forEach(n=>{
    if (n.type === 'password' || n.type === 'search') { n.remove(); return; }
    n.replaceWith(document.createTextNode(n.tagName==='SELECT' ? n.selectedOptions[0]?.textContent || '' : n.value));
  });
  const title = region.querySelector('h2,h3')?.textContent || region.getAttribute('aria-label') || 'Chỉ số · '+document.querySelector('#breadcrumb').textContent;
  const rows = [[title],['Loại dữ liệu',location.hash==='#economics'?'Dự phóng kinh tế · Tạm tính':'Giao dịch mô phỏng / Cấu hình tạm tính']];
  clone.querySelectorAll('td small').forEach(n=>n.prepend(document.createTextNode('\n')));
  const tableNodes = [...clone.querySelectorAll('table')];
  tableNodes.forEach(table=>{
    const sourceRows = [...table.rows];
    const excluded = sourceRows[0] ? [...sourceRows[0].cells].flatMap((c,i)=>c.textContent.trim()==='Cập nhật'?[i]:[]) : [];
    sourceRows.forEach(tr=>rows.push([...tr.cells].filter((c,i)=>!excluded.includes(i)).map(td=>td.innerText || td.textContent)));
    table.remove();
  });
  const stats = [...clone.querySelectorAll('.stat')];
  if (stats.length) { rows.push(['Chỉ số','Giá trị / Đơn vị','Ghi chú']); stats.forEach(n=>rows.push([n.querySelector('.stat-top')?.textContent,n.querySelector('strong')?.textContent,n.querySelector('small')?.textContent])); stats.forEach(n=>n.remove()); }
  const activities = [...clone.querySelectorAll('.activity li')];
  if (activities.length) { rows.push(['Hoạt động','Thời gian']); activities.forEach(n=>{const time=n.querySelector('small')?.textContent;n.querySelector('small')?.remove();rows.push([n.textContent.trim(),time]);n.remove();}); }
  const rewards = [...clone.querySelectorAll('.reward-list li')];
  if (rewards.length) { rows.push(['Khách / Quan hệ giới thiệu','Thưởng tầng hai (đ)']); rewards.forEach(n=>{rows.push([n.querySelector('span')?.textContent,n.querySelector('strong')?.textContent]);n.remove();}); }
  clone.querySelectorAll('li, p, h2, h3, small').forEach(n=>n.append(document.createTextNode('\n')));
  const text = clone.innerText || clone.textContent;
  if (text.trim()) rows.push(['Nội dung / Bộ lọc / Điều kiện'],[text.trim()]);
  return {title,rows,empty:Boolean(region.querySelector('.empty')) && !region.querySelector('tbody tr, .stat')};
}
function economicsSheets() {
  const a=state.assumptions, c=state.config, p=H.project(state), f=(formula,value,money=false)=>({formula,value,money});
  const input=[['Giả định kinh tế · Tạm tính','Giá trị','Đơn vị'],['Thành viên N',a.members,'người'],['Giới thiệu R',a.referrals,'lượt/người/tháng'],['Chuyển đổi C',a.conversion,'%'],['Doanh thu P',a.revenue,'đ/khách/tháng'],['Thưởng T1',c.direct,'đ/khách'],['Ưu đãi K',c.customer,'đ/khách'],['Thưởng T2',c.tier2,'đ/khách'],['Hosting',c.hosting,'đ/gói, giao dịch mô phỏng'],['Tên miền',c.domain,'đ/tên miền, giao dịch mô phỏng'],['Quy tắc','Khách duy trì, trả từ tháng đầu; ưu đãi một lần, đủ 2 tầng. Không phải lợi nhuận.'],['Làm tròn','Giữ số gốc để tính; hiển thị tiền 0 chữ số, người và tỷ lệ tối đa 2 chữ số.'],['Tách dữ liệu','Giá dịch vụ không thay P; không cộng dự phóng vào thưởng mô phỏng.']];
  const rows=[['Tháng','Khách mới (người)','Khách tích lũy (người)','Doanh thu tháng (đ)','Ưu đãi tháng (đ)','Doanh thu lũy kế (đ)','Chi phí lũy kế (đ)','Doanh thu/chi phí (lần)']];
  p.forEach((r,i)=>{const n=i+2; rows.push([r.month,f('GiaDinh!$B$2*GiaDinh!$B$3*GiaDinh!$B$4/100',r.newCustomers),f(`B${n}*A${n}`,r.active),f(`C${n}*GiaDinh!$B$5`,r.revenue,true),f(`B${n}*SUM(GiaDinh!$B$6:$B$8)`,r.cost,true),f(`SUM(D$2:D${n})`,r.revenueTotal,true),f(`SUM(E$2:E${n})`,r.costTotal,true),f(`IF(G${n}=0,"Không xác định",F${n}/G${n})`,r.ratio===null?'Không xác định':r.ratio)]);});
  return [{name:'GiaDinh',rows:input},{name:'DuPhong',rows},{name:'KPI',rows:[['Chỉ số','Giá trị','Đơn vị'],['Khách mới/tháng',f('DuPhong!B2',p[0].newCustomers),'người'],['Doanh thu 12 tháng',f('DuPhong!F13',p[11].revenueTotal,true),'đ'],['Chi phí 12 tháng',f('DuPhong!G13',p[11].costTotal,true),'đ'],['Doanh thu/chi phí',f('DuPhong!H13',p[11].ratio===null?'Không xác định':p[11].ratio),'lần']]}];
}
function installExports() {
  document.querySelectorAll('#main .panel, #main .stats').forEach((region,i)=>{
    if (region.querySelector(':scope > .export-actions')) return;
    region.dataset.report = 'report-'+i;
    region.insertAdjacentHTML('beforeend','<div class="actions export-actions"><button type="button" class="button secondary small" data-report-action="copy">Sao chép</button><button type="button" class="button secondary small" data-report-action="excel">Xuất Excel</button></div>');
  });
}
function excelValue(value) {
  if (typeof value !== 'string') return value;
  const text=value.trim();
  if (/^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?\s*₫$/.test(text)) return {value:Number(text.replace(/[.\s₫]/g,'').replace(',','.')),money:true};
  // Giữ số điện thoại/mã có số 0 đầu dưới dạng văn bản.
  if (/^(?:0|[1-9]\d*)(?:,\d+)?$/.test(text)) return Number(text.replace(',','.'));
  return value;
}
document.addEventListener('input',event=>{
  if(event.target.id==='member-search'){memberSearch=event.target.value;updateDirectory();}
});
document.addEventListener('change',event=>{
  const el=event.target;
  if(el.id==='group-filter'){memberGroup=el.value;updateDirectory();}
  if(el.id==='extra-filter'){memberExtra=el.value;updateDirectory();}
  if(el.id==='marketing-group'){marketingGroup=el.value;marketingMember='';document.querySelector('#marketing-content').innerHTML=marketingContent();}
  if(el.id==='marketing-member'){marketingMember=el.value;document.querySelector('#marketing-content').innerHTML=marketingContent();}
  if(el.name==='service' && el.closest('#registration-form')) document.querySelector('#service-price').value=money(state.config[el.value]);
});
document.addEventListener('click',event=>{
  const el=event.target.closest('button');if(!el)return;
  if(el.dataset.group){memberGroup=el.dataset.group;memberExtra='all';memberSearch='';if(location.hash==='#members')render();else location.hash='members';}
  if(el.dataset.extraGroup){memberGroup='all';memberExtra=el.dataset.extraGroup;memberSearch='';if(location.hash==='#members')render();else location.hash='members';}
  if(el.dataset.profile){selectedMember=el.dataset.profile;render();}
  if(el.dataset.pin){try{commit(s=>{const key=el.dataset.pin;s.pinnedTemplates=s.pinnedTemplates.includes(key)?s.pinnedTemplates.filter(x=>x!==key):[...s.pinnedTemplates,key];});document.querySelector('#marketing-content').innerHTML=marketingContent();notify('Đã lưu trạng thái ghim mẫu.');}catch(error){notify(error.message,true);}}
  if(el.dataset.reportAction){
    try{
      const region=el.closest('[data-report]'), report=snapshot(region);
      if(report.empty){notify('Không có dữ liệu khớp bộ lọc để sao chép/xuất.',true);return;}
      if(el.dataset.reportAction==='copy'){copy(report.rows.map(row=>row.join('\t')).join('\n'));return;}
      const sheets=[{name:'BaoCao',rows:report.rows.map(row=>row.map(excelValue))}];
      if(location.hash==='#economics'){
        sheets[0].rows.push(['Lưu ý Excel','BaoCao lưu nội dung màn hình tại lúc xuất. Sửa GiaDinh để tính lại DuPhong và KPI.']);
        sheets.push(...economicsSheets());
      }
      const data=H.xlsx(sheets),blob=new Blob([data],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download='HiveHost-'+(location.hash.slice(1)||'overview')+'.xlsx';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);notify('Đã tạo file Excel và yêu cầu trình duyệt tải xuống.');
    }catch(error){notify('Không xuất được dữ liệu: '+error.message,true);}
  }
});
window.addEventListener('hashchange', render);
window.addEventListener('storage', event => {
  if (event.key !== H.KEY && event.key !== null) return;
  try { state = event.newValue ? H.validate(JSON.parse(event.newValue)) : H.empty(); storageError = ''; render(); notify('Đã đồng bộ dữ liệu từ tab trình duyệt khác.'); }
  catch { notify('Dữ liệu từ tab khác không hợp lệ. Đang giữ dữ liệu hiện tại.', true); }
});
if (new URLSearchParams(location.search).has('ref') && !location.hash) location.hash = 'registrations';
render();
