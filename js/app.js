/* ===== 主应用逻辑 ===== */
const { queryLogistics, hasNoTraceData } = logisticsApi;
const { StatusMap } = statusMap;
const { ExpressCompanies } = expressCompanies;

// ── DOM 引用 ──────────────────────────────────────────────
const $ = id => document.getElementById(id);
const pageHome    = $('page-home');
const pageResult  = $('page-result');
const queryBtn   = $('queryBtn');
const expressNoEl = $('expressNo');
const mobileEl    = $('mobile');
const companyPickerBtn = $('companyPickerBtn');
const pickerDisplay    = $('pickerDisplay');
const companyModal     = $('companyModal');
const companyListEl   = $('companyList');
const companySearchEl  = $('companySearch');
const closeModalEl    = $('closeModal');
const globalLoading    = $('globalLoading');
const toastEl          = $('scanToast');

// ── 状态 ──────────────────────────────────────────────────
let selectedCompany = null; // { cpCode, name }
let currentData     = null;

// ── 页面切换 ────────────────────────────────────────────────
function showPage(name) {
  pageHome.classList.toggle('page-active', name === 'home');
  pageResult.classList.toggle('page-active', name === 'result');
  window.scrollTo(0, 0);
}

// ── 加载状态 ───────────────────────────────────────────────
function setLoading(on) {
  globalLoading.classList.toggle('open', on);
  queryBtn.disabled = on;
  queryBtn.textContent = on ? '查询中...' : '查 询';
}

// ── Toast ─────────────────────────────────────────────────
function showToast(msg, duration = 2500) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), duration);
}

// ── 扫码（浏览器环境下提示） ───────────────────────────────
$('scanBtn').addEventListener('click', () => {
  // H5 浏览器尝试调用扫码接口（部分浏览器支持）
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    // 尝试调起扫码（仅部分新版浏览器支持）
    try {
      const qr = new QRCodeScanner();
      qr.startVideoScan(video => {
        expressNoEl.value = video;
        qr.stop();
        showToast('扫码成功');
      });
    } catch (e) {
      showToast('请在微信中使用扫码功能');
    }
  } else {
    showToast('请在微信中长按快递面单识别单号，或手动输入');
  }
});

// ── 快递公司弹窗 ────────────────────────────────────────────
function renderCompanyList(list) {
  let html = `
    <div class="modal-item ${!selectedCompany ? 'active' : ''}" data-cpcode="">
      <span>自动识别（推荐）</span>
      ${!selectedCompany ? '<span class="check-icon">✓</span>' : ''}
    </div>`;
  html += list.map(c => `
    <div class="modal-item ${selectedCompany && selectedCompany.cpCode === c.cpCode ? 'active' : ''}"
         data-cpcode="${c.cpCode}" data-name="${c.name}">
      <span>${c.name}</span>
      ${selectedCompany && selectedCompany.cpCode === c.cpCode ? '<span class="check-icon">✓</span>' : ''}
    </div>`).join('');
  if (list.length === 0) {
    html = '<div class="modal-empty">未找到匹配的快递公司</div>';
  }
  companyListEl.innerHTML = html;
}

function openCompanyModal() {
  companyModal.classList.add('open');
  companySearchEl.value = '';
  renderCompanyList(ExpressCompanies);
  companySearchEl.focus();
}

function closeCompanyModal() {
  companyModal.classList.remove('open');
}

companyPickerBtn.addEventListener('click', openCompanyModal);
closeModalEl.addEventListener('click', closeCompanyModal);
companyModal.addEventListener('click', e => {
  if (e.target === companyModal) closeCompanyModal();
});

companySearchEl.addEventListener('input', e => {
  const kw = e.target.value.trim();
  const list = kw
    ? ExpressCompanies.filter(c =>
        c.name.includes(kw) || c.cpCode.toLowerCase().includes(kw.toLowerCase()))
    : ExpressCompanies;
  renderCompanyList(list);
});

companyListEl.addEventListener('click', e => {
  const item = e.target.closest('.modal-item');
  if (!item) return;
  const { cpcode, name } = item.dataset;
  selectedCompany = cpcode ? { cpCode: cpcode, name } : null;
  pickerDisplay.textContent = selectedCompany ? selectedCompany.name : '自动识别（推荐）';
  closeCompanyModal();
});

// ── 查询 ────────────────────────────────────────────────────
queryBtn.addEventListener('click', doQuery);

function doQuery() {
  const expressNo = expressNoEl.value.trim();
  const mobile    = mobileEl.value.trim();
  const cpCode    = selectedCompany ? selectedCompany.cpCode : '';

  // 必填校验
  if (!expressNo) {
    $('expressNoError').textContent = '请输入快递单号';
    expressNoEl.focus();
    return;
  }
  $('expressNoError').textContent = '';

  // 顺丰/中通/跨越 手机号格式
  const sfLike = cpCode === 'SF' || cpCode === 'ZTO' || cpCode === 'KYSY';
  if (sfLike && mobile && !/^\d{4}$/.test(mobile)) {
    $('mobileError').textContent = '顺丰/中通/跨越需填写手机号后4位';
    return;
  }
  $('mobileError').textContent = '';

  setLoading(true);

  queryLogistics({ expressNo, mobile, cpCode })
    .then(data => {
      setLoading(false);

      if (hasNoTraceData(data)) {
        // 未查到物流，友好提示
        const parts = [];
        if (selectedCompany) parts.push(`检查「${selectedCompany.name}」是否正确`);
        if (mobile && !selectedCompany) parts.push('检查手机号后4位是否正确');
        parts.push('或尝试不填手机号/公司，仅用单号重新查询');
        const msg = '未查询到物流信息\n\n' + parts.join('\n');

        const ok = confirm(msg + '\n\n点击"确定"仅用单号重试？');
        if (ok) {
          // 清空手机号和公司重查
          selectedCompany = null;
          mobileEl.value = '';
          pickerDisplay.textContent = '自动识别（推荐）';
          doQuery();
        }
        return;
      }

      // 成功 → 展示结果页
      currentData = data;
      renderResult(data);
      showPage('result');
    })
    .catch(err => {
      setLoading(false);
      alert('查询失败：' + (err.message || '请稍后重试'));
    });
}

// ── 渲染结果页 ─────────────────────────────────────────────
function renderResult(data) {
  const {
    logisticsCompanyName = '',
    mailNo = '',
    cpCode = '',
    cpMobile = '',
    cpUrl = '',
    theLastMessage = '',
    theLastTime = '',
    logisticsStatus = '',
    logisticsStatusDesc = '',
    logisticsTraceDetailList = [],
  } = data;

  // 公司首字logo
  $('companyLogo').textContent = (logisticsCompanyName || '快')[0];
  $('companyName').textContent = logisticsCompanyName || '快递公司';
  $('mailNo').textContent = mailNo || cpCode;

  if (cpMobile) {
    $('cpMobileArea').style.display = '';
    $('cpMobile').textContent = cpMobile;
  } else {
    $('cpMobileArea').style.display = 'none';
  }

  // 状态标签
  const mainInfo = StatusMap.getMainStatusInfo(logisticsStatus);
  const firstTrace = logisticsTraceDetailList[0] || {};
  const subText = firstTrace.subLogisticsStatus
    ? StatusMap.getStatusText(firstTrace.subLogisticsStatus)
    : '';
  const displayText = subText ? `${logisticsStatusDesc || mainInfo.text} · ${subText}` : (logisticsStatusDesc || mainInfo.text);
  const badge = $('statusBadge');
  badge.textContent = displayText;
  badge.style.background = mainInfo.color + '20';
  badge.style.color = mainInfo.color;
  badge.style.border = `1.5px solid ${mainInfo.color}40`;

  // 最新动态
  $('latestMsg').textContent = theLastMessage || '暂无物流动态';
  $('latestTime').textContent = theLastTime || '';

  // 官网按钮
  if (cpUrl) {
    $('openUrlBtn').style.display = '';
    $('openUrlBtn').onclick = () => {
      if (confirm(`即将打开：\n${cpUrl}`)) window.open(cpUrl, '_blank');
    };
  } else {
    $('openUrlBtn').style.display = 'none';
  }

  // 时间轴（倒序，最新在前）
  const traces = [...(logisticsTraceDetailList || [])].reverse();

  if (traces.length === 0) {
    $('timelineCard').style.display = '';
    $('emptyCard').style.display = '';
    $('timeline').innerHTML = '';
    return;
  }

  $('emptyCard').style.display = 'none';
  $('timelineCard').style.display = '';

  $('timeline').innerHTML = traces.map((t, i) => `
    <div class="timeline-item ${i === 0 ? 'first' : ''}">
      <div class="timeline-dot ${i === 0 ? 'dot-active' : ''}"></div>
      ${i < traces.length - 1 ? '<div class="timeline-line"></div>' : ''}
      <div class="timeline-body">
        <div class="trace-desc ${i === 0 ? 'desc-active' : ''}">${t.desc || ''}</div>
        ${t.areaName ? `<div class="trace-area">📍 ${t.areaName}</div>` : ''}
        <div class="trace-time">${t.timeDesc || ''}</div>
      </div>
    </div>`).join('');
}

// ── 返回 / 重新查询 ─────────────────────────────────────────
$('backBtn').addEventListener('click', () => showPage('home'));
$('retryBtn').addEventListener('click', () => showPage('home'));
$('reQueryBtn').addEventListener('click', () => showPage('home'));

// ── 回车触发表单提交 ─────────────────────────────────────────
expressNoEl.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); doQuery(); }
});