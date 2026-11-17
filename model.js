/* Nguồn dữ liệu và tính toán dùng chung; có thể kiểm tra trực tiếp bằng Node.js. */
(function (root) {
  'use strict';
  const KEY = 'hivehost.referral.v1';
  const DEFAULT_CONFIG = { hosting: 1200000, domain: 350000, direct: 100000, customer: 50000, tier2: 30000 };
  const DEFAULT_ASSUMPTIONS = { members: 100, referrals: 2, conversion: 20, revenue: 100000 };
  const normalize = value => String(value || '').trim().toLowerCase();
  const phoneKey = value => String(value || '').replace(/\D/g, '').replace(/^84(?=\d{9}$)/, '0');
  // Gộp bí danh Gmail để tránh tự giới thiệu qua dấu chấm hoặc hậu tố +.
  function emailKey(value) {
    const email = normalize(value), parts = email.split('@');
    if (['gmail.com', 'googlemail.com'].includes(parts[1])) return parts[0].split('+')[0].replace(/\./g, '') + '@gmail.com';
    return email;
  }
  const id = () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2);
  const empty = () => ({ version: 1, members: [], registrations: [], config: { ...DEFAULT_CONFIG }, assumptions: { ...DEFAULT_ASSUMPTIONS }, activities: [], pinnedTemplates: [] });
  function validNumber(value, label, max = 1e12) {
    if (value === '' || value === null || value === undefined || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > max) throw new Error(label + ' phải là số từ 0 đến ' + max.toLocaleString('vi-VN') + '.');
    return Number(value);
  }
  function identity(input) {
    const name = String(input.name || '').trim(), email = normalize(input.email), rawPhone = String(input.phone || '').trim(), phone = phoneKey(rawPhone);
    if (name.length < 2 || name.length > 100) throw new Error('Họ tên cần từ 2 đến 100 ký tự.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw new Error('Vui lòng nhập địa chỉ email hợp lệ.');
    // Không biến dữ liệu sai như "abc" thành số điện thoại trống rồi cho đăng ký.
    if (rawPhone && (!/^[+\d\s().-]+$/.test(rawPhone) || !/^0\d{9}$/.test(phone))) throw new Error('Số điện thoại cần 10 chữ số, bắt đầu bằng 0 (hoặc +84), không chứa chữ.');
    return { name, email, phone };
  }
  const samePerson = (a, b) => emailKey(a.email) === emailKey(b.email) || Boolean(a.phone && b.phone && phoneKey(a.phone) === phoneKey(b.phone));
  function record(state, text) { state.activities.unshift({ id: id(), text, at: new Date().toISOString() }); state.activities = state.activities.slice(0, 80); }
  function memberByCode(state, code) { return state.members.find(m => m.code === String(code || '').trim().toUpperCase()); }
  function addMember(state, input) {
    const person = identity(input);
    if (!person.phone) throw new Error('Vui lòng nhập số điện thoại hợp lệ.');
    if (state.members.some(m => samePerson(m, person))) throw new Error('Email hoặc số điện thoại đã được đăng ký thành viên.');
    const sponsorCode = String(input.sponsor || '').trim();
    const sponsor = sponsorCode ? memberByCode(state, sponsorCode) : null;
    if (sponsorCode && !sponsor) throw new Error('Mã người giới thiệu thành viên không tồn tại.');
    if (sponsor && samePerson(sponsor, person)) throw new Error('Không thể tự giới thiệu chính mình.');
    let code;
    do { code = 'HIVE-' + id().replace(/-/g, '').slice(-8).toUpperCase(); } while (state.members.some(m => m.code === code));
    let memberId;
    do { memberId = id(); } while (state.members.some(m => m.id === memberId || m.memberCode === 'TV-' + memberId.toUpperCase()));
    const member = { ...person, id: memberId, memberCode: 'TV-' + memberId.toUpperCase(), code, sponsorId: sponsor?.id || null, createdAt: new Date().toISOString() };
    state.members.push(member); record(state, person.name + ' tham gia cộng đồng.'); return member;
  }
  function addRegistration(state, input) {
    const person = identity(input), referrer = memberByCode(state, input.code);
    if (!referrer) throw new Error('Mã giới thiệu không tồn tại. Vui lòng kiểm tra lại.');
    if (!['hosting', 'domain'].includes(input.service)) throw new Error('Vui lòng chọn dịch vụ hợp lệ.');
    if (samePerson(referrer, person)) throw new Error('Không thể tự giới thiệu: email hoặc số điện thoại trùng người giới thiệu.');
    const ancestor = state.members.find(m => m.id === referrer.sponsorId);
    if (ancestor && samePerson(ancestor, person)) throw new Error('Không chấp nhận giới thiệu vòng: khách hàng là người hưởng thưởng tầng hai.');
    if (state.registrations.some(r => samePerson(r, person))) throw new Error('Khách hàng này đã có giao dịch (kể cả bị từ chối). Hãy cập nhật trạng thái giao dịch cũ.');
    const registration = { ...person, id: id(), referrerId: referrer.id, service: input.service, price: state.config[input.service], status: 'pending', reward: null, createdAt: new Date().toISOString() };
    state.registrations.push(registration); record(state, person.name + ' đăng ký ' + input.service + ' · Chờ xác nhận.'); return registration;
  }
  function setStatus(state, registrationId, status) {
    if (!['pending', 'approved', 'rejected'].includes(status)) throw new Error('Trạng thái không hợp lệ.');
    const registration = state.registrations.find(r => r.id === registrationId);
    if (!registration) throw new Error('Không tìm thấy giao dịch.');
    if (registration.status === status) return;
    // Chỉ chốt mức thưởng ở lần duyệt đầu; hủy rồi duyệt lại không đổi mức cũ.
    if (status === 'approved' && !registration.reward) {
      const referrer = state.members.find(m => m.id === registration.referrerId);
      if (!referrer) throw new Error('Không tìm thấy thành viên giới thiệu.');
      registration.reward = { direct: state.config.direct, customer: Math.min(state.config.customer, registration.price), tier2: referrer.sponsorId ? state.config.tier2 : 0, tier2Id: referrer.sponsorId };
    }
    registration.status = status;
    record(state, registration.name + ' → ' + ({ pending: 'Chờ xác nhận', approved: 'Thành công', rejected: 'Không hợp lệ' })[status] + '.');
  }
  function totals(state, memberId) {
    const registrations = memberId ? state.registrations.filter(r => r.referrerId === memberId) : state.registrations;
    const approved = registrations.filter(r => r.status === 'approved');
    const direct = approved.reduce((s, r) => s + r.reward.direct, 0);
    const customer = approved.reduce((s, r) => s + r.reward.customer, 0);
    const tier2 = state.registrations.filter(r => r.status === 'approved' && (!memberId || r.reward.tier2Id === memberId)).reduce((s, r) => s + r.reward.tier2, 0);
    return { count: registrations.length, pending: registrations.filter(r => r.status === 'pending').length, approved: approved.length, rejected: registrations.filter(r => r.status === 'rejected').length, direct, customer, tier2, rewards: direct + tier2 + (memberId ? 0 : customer), revenue: approved.reduce((s, r) => s + r.price, 0) };
  }
  function configure(state, input) {
    const config = {};
    for (const key of Object.keys(DEFAULT_CONFIG)) { config[key] = validNumber(input[key], 'Giá trị cấu hình', 1e9); if (!Number.isInteger(config[key])) throw new Error('Giá và mức thưởng phải là số đồng nguyên.'); }
    state.config = config; record(state, 'Cập nhật giá và mức thưởng tạm tính.');
  }
  function assumptions(state, input) {
    const next = {};
    for (const key of Object.keys(DEFAULT_ASSUMPTIONS)) next[key] = validNumber(input[key], 'Giả định', key === 'conversion' ? 100 : key === 'revenue' ? 1e9 : 1000000);
    if (!Number.isInteger(next.members)) throw new Error('Số thành viên phải là số nguyên.');
    state.assumptions = next;
  }
  function project(state) {
    const a = state.assumptions, newCustomers = a.members * a.referrals * a.conversion / 100;
    const rewardPerCustomer = state.config.direct + state.config.customer + state.config.tier2;
    let revenueTotal = 0, costTotal = 0;
    return Array.from({ length: 12 }, (_, i) => {
      const active = newCustomers * (i + 1), revenue = active * a.revenue, cost = newCustomers * rewardPerCustomer;
      revenueTotal += revenue; costTotal += cost;
      return { month: i + 1, newCustomers, active, revenue, cost, revenueTotal, costTotal, ratio: costTotal ? revenueTotal / costTotal : null };
    });
  }
  function demo() {
    const state = empty();
    const people = [['Nguyễn Minh Anh', 'minhanh@example.com'], ['Trần Hoàng Nam', 'hoangnam@example.com'], ['Lê Thảo Vy', 'thaovy@example.com'], ['Phạm Gia Huy', 'giahuy@example.com']];
    people.forEach(([name, email], i) => addMember(state, { name, email, phone: '090000000' + i, sponsor: i === 1 || i === 2 ? state.members[0].code : '' }));
    const customers = ['Đỗ Khánh Linh', 'Vũ Đức Anh', 'Bùi Ngọc Mai', 'Hoàng Tuấn Kiệt', 'Đặng Hà My', 'Ngô Quang Minh', 'Trịnh Bảo Ngân', 'Đinh Phúc An'];
    customers.forEach((name, i) => {
      const r = addRegistration(state, { name, email: 'khach' + (i + 1) + '@example.com', code: state.members[i % 4].code, service: i % 3 === 0 ? 'domain' : 'hosting' });
      if (i < 4) setStatus(state, r.id, 'approved'); else if (i === 7) setStatus(state, r.id, 'rejected');
    });
    record(state, 'Đã nạp dữ liệu demo tạm · Chưa phải dữ liệu BTC.'); return state;
  }
  function validate(state) {
    if (!state || state.version !== 1 || !Array.isArray(state.members) || !Array.isArray(state.registrations) || !Array.isArray(state.activities)) throw new Error('Dữ liệu lưu không đúng định dạng.');
    const temp = empty(); configure(temp, state.config); assumptions(temp, state.assumptions);
    const ids = new Set(), codes = new Set();
    state.members.forEach(m => { identity(m); if (!m.id || !m.code || ids.has(m.id) || codes.has(m.code)) throw new Error('Dữ liệu thành viên không hợp lệ.'); ids.add(m.id); codes.add(m.code); });
    state.members.forEach(m => { if (m.sponsorId && (!ids.has(m.sponsorId) || m.sponsorId === m.id)) throw new Error('Dữ liệu tầng hai không hợp lệ.'); });
    const registrationIds = new Set(), customerEmails = new Set(), customerPhones = new Set();
    state.registrations.forEach(r => {
      const person = identity(r), email = emailKey(person.email), phone = phoneKey(person.phone);
      validNumber(r.price, 'Giá dịch vụ');
      if (!r.id || !ids.has(r.referrerId) || !['hosting', 'domain'].includes(r.service) || !['pending', 'approved', 'rejected'].includes(r.status)) throw new Error('Dữ liệu giao dịch không hợp lệ.');
      // Kiểm tra cả dữ liệu đọc từ localStorage để không tính thưởng hai lần.
      if (registrationIds.has(r.id)) throw new Error('Dữ liệu lưu có giao dịch trùng ID. Không thể nhận dữ liệu này vì có thể tính thưởng trùng.');
      if (customerEmails.has(email) || (phone && customerPhones.has(phone))) throw new Error('Dữ liệu lưu có khách hàng trùng email hoặc số điện thoại. Không thể nhận dữ liệu này vì có thể tính thưởng trùng.');
      registrationIds.add(r.id); customerEmails.add(email);
      if (phone) customerPhones.add(phone);
      if (r.status === 'approved' && !r.reward) throw new Error('Giao dịch thiếu mức thưởng.');
      if (r.reward) { ['direct', 'customer', 'tier2'].forEach(k => validNumber(r.reward[k], 'Mức thưởng')); if (r.reward.tier2Id && !ids.has(r.reward.tier2Id)) throw new Error('Thiếu thành viên tầng hai.'); }
    });
    // Nâng cấp tại chỗ, giữ nguyên mã giới thiệu, lịch sử và quan hệ cũ.
    state.members.forEach(m => { if (!m.memberCode) m.memberCode = 'TV-' + m.id.toUpperCase(); });
    if (!Array.isArray(state.pinnedTemplates)) state.pinnedTemplates = [];
    return state;
  }
  function segment(state, member, now = Date.now()) {
    const rows = state.registrations.filter(r => r.referrerId === member.id);
    const latest = rows.reduce((n, r) => Math.max(n, Date.parse(r.createdAt) || 0), 0);
    return { group: rows.some(r => r.status === 'approved') ? 'active' : rows.length ? 'potential' : 'new', activated: rows.length > 0, inactive: rows.length > 0 && latest < now - 30 * 86400000, latest };
  }
  // XLSX tối giản: các worksheet XML trong ZIP chuẩn, không giả CSV thành Excel.
  // Chuỗi luôn là inlineStr, không biến nội dung người dùng thành công thức.
  function xlsx(sheets) {
    const xml = s => String(s ?? '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]);
    const column = n => { let s = ''; for (n++; n; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s; return s; };
    const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    const rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    const files = {
      '[Content_Types].xml': `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
      '_rels/.rels': `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      'xl/workbook.xml': `<workbook xmlns="${ns}" xmlns:r="${rel}"><sheets>${sheets.map((s,i)=>`<sheet name="${xml(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`,
      'xl/_rels/workbook.xml.rels': `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="${rel}/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="styles" Type="${rel}/styles" Target="styles.xml"/></Relationships>`,
      'xl/styles.xml': `<styleSheet xmlns="${ns}"><numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0&quot; đ&quot;"/><numFmt numFmtId="165" formatCode="#,##0.##"/></numFmts><fonts count="1"><font><sz val="12"/><name val="Times New Roman"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`
    };
    sheets.forEach((sheet, i) => {
      files[`xl/worksheets/sheet${i+1}.xml`] = `<worksheet xmlns="${ns}"><cols><col min="1" max="1" width="38" customWidth="1"/><col min="2" max="30" width="24" customWidth="1"/></cols><sheetData>${sheet.rows.map((row,r)=>`<row r="${r+1}">${row.map((cell,c)=>{
        const obj = cell && typeof cell === 'object' ? cell : {value:cell};
        const value = obj.value, ref = column(c)+(r+1), style = obj.money ? 1 : typeof value === 'number' ? 2 : 0;
        if (obj.formula) return `<c r="${ref}" s="${style}"${typeof value === 'string' ? ' t="str"' : ''}><f>${xml(obj.formula)}</f><v>${xml(value)}</v></c>`;
        return typeof value === 'number' && Number.isFinite(value) ? `<c r="${ref}" s="${style}"><v>${value}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
      }).join('')}</row>`).join('')}</sheetData></worksheet>`;
    });
    const enc = new TextEncoder(), parts = [], directory = []; let offset = 0;
    const crc32 = bytes => { let crc = -1; for (const b of bytes) { crc ^= b; for (let k=0;k<8;k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); } return (crc ^ -1) >>> 0; };
    for (const [name, content] of Object.entries(files)) {
      const n = enc.encode(name), data = enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+content), crc=crc32(data);
      const head = new Uint8Array(30+n.length), h = new DataView(head.buffer);
      h.setUint32(0,0x04034b50,true); h.setUint16(4,20,true); h.setUint16(12,33,true); h.setUint32(14,crc,true); h.setUint32(18,data.length,true); h.setUint32(22,data.length,true); h.setUint16(26,n.length,true); head.set(n,30);
      const central = new Uint8Array(46+n.length), d = new DataView(central.buffer);
      d.setUint32(0,0x02014b50,true); d.setUint16(4,20,true); d.setUint16(6,20,true); d.setUint16(14,33,true); d.setUint32(16,crc,true); d.setUint32(20,data.length,true); d.setUint32(24,data.length,true); d.setUint16(28,n.length,true); d.setUint32(42,offset,true); central.set(n,46);
      parts.push(head,data); directory.push(central); offset += head.length+data.length;
    }
    const end = new Uint8Array(22), e = new DataView(end.buffer), size=directory.reduce((n,a)=>n+a.length,0);
    e.setUint32(0,0x06054b50,true); e.setUint16(8,directory.length,true); e.setUint16(10,directory.length,true); e.setUint32(12,size,true); e.setUint32(16,offset,true);
    const result = new Uint8Array(offset+size+22); let cursor=0;
    for (const part of [...parts,...directory,end]) { result.set(part,cursor); cursor+=part.length; }
    return result;
  }
  const api = { KEY, empty, demo, addMember, addRegistration, setStatus, totals, configure, assumptions, project, validate, memberByCode, emailKey, segment, xlsx };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Hive = api;
})(typeof window === 'undefined' ? globalThis : window);
