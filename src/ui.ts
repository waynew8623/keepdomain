export const ADMIN_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>域名续费提醒</title>
<style>
  :root {
    --bg: #f5f6f8;
    --card: #ffffff;
    --border: #e5e7eb;
    --text: #1f2937;
    --muted: #6b7280;
    --primary: #2563eb;
    --primary-hover: #1d4ed8;
    --red: #dc2626;
    --orange: #d97706;
    --green: #16a34a;
    --gray: #9ca3af;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    font-size: 14px;
    line-height: 1.6;
  }
  header {
    background: var(--card);
    border-bottom: 1px solid var(--border);
    padding: 14px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  header h1 { font-size: 18px; margin: 0; }
  main { max-width: 980px; margin: 24px auto; padding: 0 16px; display: grid; gap: 20px; }
  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  }
  .card h2 { margin: 0 0 16px; font-size: 16px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; align-items: end; }
  label { display: block; font-size: 12px; color: var(--muted); margin-bottom: 4px; }
  input, select {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 14px;
    background: #fff;
    color: var(--text);
  }
  input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
  button {
    padding: 8px 14px;
    border: 1px solid var(--primary);
    border-radius: 8px;
    background: var(--primary);
    color: #fff;
    font-size: 14px;
    cursor: pointer;
    white-space: nowrap;
  }
  button:hover { background: var(--primary-hover); }
  .btn-ghost { background: transparent; color: var(--primary); }
  .btn-ghost:hover { background: rgba(37,99,235,0.08); }
  .btn-sm { padding: 4px 10px; font-size: 12px; border-radius: 6px; }
  .btn-danger { background: transparent; color: var(--red); border-color: var(--red); }
  .btn-danger:hover { background: rgba(220,38,38,0.08); }
  .btn-success { background: var(--green); border-color: var(--green); }
  .btn-success:hover { background: #128a3e; }
  .btn-warn { background: var(--gray); border-color: var(--gray); }
  .btn-warn:hover { background: #6b7280; }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  th { font-size: 12px; color: var(--muted); font-weight: 600; white-space: nowrap; }
  td { font-size: 13px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  .badge.active { background: #fef3c7; color: #b45309; }
  .badge.renewed { background: #dcfce7; color: #15803d; }
  .badge.abandoned { background: #f3f4f6; color: #6b7280; }
  .days { font-weight: 600; white-space: nowrap; }
  .days.overdue { color: var(--red); }
  .days.soon { color: var(--orange); }
  .days.ok { color: var(--green); }
  .muted { color: var(--muted); }
  .error { color: var(--red); }
  .msg { margin-top: 10px; }
  .hidden { display: none !important; }
  .section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .section-head h2 { margin: 0; }
  .filter label { display: inline-flex; align-items: center; gap: 4px; margin: 0 0 0 12px; font-size: 13px; color: var(--text); cursor: pointer; }
  .login-card { max-width: 360px; margin: 120px auto; }
  .login-card h1 { font-size: 20px; margin: 0 0 8px; }
  .actions { display: flex; gap: 6px; flex-wrap: wrap; }
  .modal {
    position: fixed; inset: 0; background: rgba(0,0,0,0.4);
    display: flex; align-items: center; justify-content: center; z-index: 10;
  }
  .modal .card { width: 440px; max-width: 92vw; }
</style>
</head>
<body>
  <div id="login-view" class="hidden">
    <div class="card login-card">
      <h1>域名续费提醒</h1>
      <p class="muted">请输入管理密码</p>
      <form id="login-form">
        <input type="password" id="login-password" placeholder="管理密码" autocomplete="current-password">
        <button type="submit" style="margin-top:12px;width:100%">登录</button>
      </form>
      <p id="login-error" class="error hidden"></p>
    </div>
  </div>

  <div id="app-view" class="hidden">
    <header>
      <h1>域名续费提醒</h1>
      <button id="logout-btn" class="btn-ghost">退出登录</button>
    </header>
    <main>
      <section class="card">
        <h2>新增域名</h2>
        <form id="add-form" class="grid">
          <div>
            <label>账户名</label>
            <input id="a-account" placeholder="如 公司注册账号">
          </div>
          <div>
            <label>平台</label>
            <input id="a-platform" list="platform-list" placeholder="如 阿里云 / Cloudflare">
            <datalist id="platform-list"></datalist>
          </div>
          <div>
            <label>域名</label>
            <input id="a-domain" placeholder="example.com">
          </div>
          <div>
            <label>到期时间</label>
            <input type="date" id="a-expire">
          </div>
          <div>
            <label>提前提醒天数</label>
            <input id="a-days" type="number" min="1" max="365" value="30">
          </div>
          <button type="submit">添加</button>
        </form>
        <p id="add-msg" class="msg hidden"></p>
      </section>

      <section class="card">
        <div class="section-head">
          <h2>域名列表</h2>
          <div class="filter">
            <label><input type="radio" name="filter" value="all" checked> 全部</label>
            <label><input type="radio" name="filter" value="active"> 仅待处理</label>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>账户名</th><th>平台</th><th>域名</th><th>到期时间</th><th>剩余天数</th><th>状态</th><th>操作</th></tr>
            </thead>
            <tbody id="domain-tbody"></tbody>
          </table>
        </div>
        <p id="empty" class="muted hidden">暂无记录</p>
      </section>

      <section class="card">
        <h2>通知设置</h2>
        <form id="settings-form" class="grid">
          <div>
            <label>收件邮箱（全局）</label>
            <input id="s-notify" type="email" placeholder="you@example.com">
          </div>
          <div>
            <label>发件地址（Resend 已验证域名）</label>
            <input id="s-from" placeholder="Acme &lt;notify@resend.dev&gt;">
          </div>
          <div>
            <label>Resend API Key（留空则不修改）</label>
            <input id="s-key" type="password" placeholder="re_...">
          </div>
          <button type="submit">保存设置</button>
          <button type="button" id="test-email-btn" class="btn-ghost">发送测试邮件</button>
        </form>
        <p id="settings-msg" class="msg hidden"></p>
      </section>
    </main>
  </div>

  <div id="edit-modal" class="modal hidden">
    <div class="card">
      <h2>编辑域名</h2>
      <form id="edit-form" class="grid">
        <input type="hidden" id="e-id">
        <div><label>账户名</label><input id="e-account"></div>
        <div><label>平台</label><input id="e-platform" list="platform-list"></div>
        <div><label>域名</label><input id="e-domain"></div>
        <div><label>到期时间</label><input type="date" id="e-expire"></div>
        <div><label>提前提醒天数</label><input id="e-days" type="number" min="1" max="365"></div>
        <button type="submit">保存</button>
        <button type="button" id="cancel-edit" class="btn-ghost">取消</button>
      </form>
    </div>
  </div>

<script>
(function () {
  var domains = [];
  var settings = { notify_email: '', from_email: '', resend_api_key_masked: '', has_resend_api_key: false };
  var filter = 'all';

  function $(id) { return document.getElementById(id); }

  function api(path, method, body) {
    var opts = { method: method || 'GET', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' };
    if (body) opts.body = JSON.stringify(body);
    return fetch(path, opts).then(function (res) {
      return res.json().then(function (data) {
        return { ok: res.ok, status: res.status, data: data };
      }).catch(function () {
        return { ok: res.ok, status: res.status, data: null };
      });
    });
  }

  function show(el) { el.classList.remove('hidden'); }
  function hide(el) { el.classList.add('hidden'); }
  function msg(el, text, isError) {
    el.textContent = text || '';
    el.classList.toggle('error', !!isError);
    if (text) show(el); else hide(el);
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatDate(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function daysUntil(dateStr) {
    var a = new Date(dateStr + 'T00:00:00');
    var b = new Date(formatDate(new Date()) + 'T00:00:00');
    return Math.round((a - b) / 86400000);
  }

  function daysText(left) {
    if (left < 0) return '已逾期 ' + Math.abs(left) + ' 天';
    if (left === 0) return '今天到期';
    return '剩余 ' + left + ' 天';
  }
  function daysClass(left) {
    if (left <= 0) return 'overdue';
    if (left <= 7) return 'soon';
    return 'ok';
  }

  var statusMap = {
    active: { label: '待处理', cls: 'active' },
    renewed: { label: '已续费', cls: 'renewed' },
    abandoned: { label: '已放弃', cls: 'abandoned' }
  };

  function renderDomains() {
    var tbody = $('domain-tbody');
    var list = domains.filter(function (d) {
      return filter === 'all' || d.status === 'active';
    });
    var platforms = [];
    tbody.innerHTML = '';
    if (list.length === 0) {
      show($('empty'));
    } else {
      hide($('empty'));
      list.forEach(function (d) {
        var left = daysUntil(d.expire_date);
        var st = statusMap[d.status] || statusMap.active;
        if (platforms.indexOf(d.platform) < 0) platforms.push(d.platform);
        var actions = '';
        if (d.status === 'active') {
          actions += '<button class="btn-sm btn-success" onclick="APP.confirm(\\'' + d.id + '\\',\\'renewed\\')">已续费</button>';
          actions += '<button class="btn-sm btn-warn" onclick="APP.confirm(\\'' + d.id + '\\',\\'abandoned\\')">放弃</button>';
        }
        actions += '<button class="btn-sm btn-ghost" onclick="APP.edit(\\'' + d.id + '\\')">编辑</button>';
        actions += '<button class="btn-sm btn-danger" onclick="APP.remove(\\'' + d.id + '\\')">删除</button>';
        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td>' + escapeHtml(d.account || '') + '</td>' +
          '<td>' + escapeHtml(d.platform) + '</td>' +
          '<td><b>' + escapeHtml(d.domain) + '</b></td>' +
          '<td>' + escapeHtml(d.expire_date) + '</td>' +
          '<td class="days ' + daysClass(left) + '">' + daysText(left) + '</td>' +
          '<td><span class="badge ' + st.cls + '">' + st.label + '</span></td>' +
          '<td><div class="actions">' + actions + '</div></td>';
        tbody.appendChild(tr);
      });
    }
    var dl = $('platform-list');
    dl.innerHTML = '';
    platforms.forEach(function (p) {
      var opt = document.createElement('option');
      opt.value = p;
      dl.appendChild(opt);
    });
  }

  function renderSettings() {
    $('s-notify').value = settings.notify_email || '';
    $('s-from').value = settings.from_email || '';
    $('s-key').value = settings.resend_api_key_masked || '';
    $('s-key').placeholder = settings.has_resend_api_key ? '已配置（留空则不修改）' : 're_... 尚未配置';
  }

  function loadAll() {
    api('/api/domains').then(function (r) {
      if (r.ok) { domains = r.data.domains || []; renderDomains(); }
    });
    api('/api/settings').then(function (r) {
      if (r.ok) { settings = r.data.settings || settings; renderSettings(); }
    });
  }

  function checkAuth() {
    return api('/api/me').then(function (r) {
      if (r.ok) {
        show($('app-view'));
        hide($('login-view'));
        loadAll();
      } else {
        show($('login-view'));
        hide($('app-view'));
      }
    });
  }

  window.APP = {
    confirm: function (id, action) {
      if (!window.confirm('确认标记为「' + (action === 'renewed' ? '已续费' : '放弃续费') + '」吗？确认后将停止提醒。')) return;
      api('/api/domains/' + id + '/confirm', 'POST', { action: action }).then(function (r) {
        if (r.ok) loadAll(); else alert(r.data && r.data.error ? r.data.error : '操作失败');
      });
    },
    edit: function (id) {
      var d = null;
      domains.forEach(function (x) { if (x.id === id) d = x; });
      if (!d) return;
      $('e-id').value = d.id;
      $('e-account').value = d.account || '';
      $('e-platform').value = d.platform;
      $('e-domain').value = d.domain;
      $('e-expire').value = d.expire_date;
      $('e-days').value = d.notify_days_ahead || 30;
      show($('edit-modal'));
    },
    remove: function (id) {
      var name = id;
      domains.forEach(function (x) { if (x.id === id) name = x.domain; });
      if (!window.confirm('确认删除域名 ' + name + ' 吗？此操作不可恢复。')) return;
      api('/api/domains/' + id, 'DELETE').then(function (r) {
        if (r.ok) loadAll(); else alert(r.data && r.data.error ? r.data.error : '删除失败');
      });
    }
  };

  $('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var pwd = $('login-password').value;
    api('/api/login', 'POST', { password: pwd }).then(function (r) {
      if (r.ok) {
        hide($('login-error'));
        $('login-password').value = '';
        checkAuth();
      } else {
        msg($('login-error'), r.data && r.data.error ? r.data.error : '密码错误', true);
      }
    });
  });

  $('logout-btn').addEventListener('click', function () {
    api('/api/logout', 'POST').then(function () { checkAuth(); });
  });

  $('add-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var body = {
      account: $('a-account').value.trim(),
      platform: $('a-platform').value.trim(),
      domain: $('a-domain').value.trim(),
      expire_date: $('a-expire').value,
      notify_days_ahead: parseInt($('a-days').value, 10) || 30
    };
    api('/api/domains', 'POST', body).then(function (r) {
      if (r.ok) {
        $('add-form').reset();
        msg($('add-msg'), '已添加');
        loadAll();
      } else {
        msg($('add-msg'), r.data && r.data.error ? r.data.error : '添加失败', true);
      }
    });
  });

  $('edit-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var id = $('e-id').value;
    var body = {
      account: $('e-account').value.trim(),
      platform: $('e-platform').value.trim(),
      domain: $('e-domain').value.trim(),
      expire_date: $('e-expire').value,
      notify_days_ahead: parseInt($('e-days').value, 10) || 30
    };
    api('/api/domains/' + id, 'PUT', body).then(function (r) {
      if (r.ok) { hide($('edit-modal')); loadAll(); }
      else alert(r.data && r.data.error ? r.data.error : '保存失败');
    });
  });

  $('cancel-edit').addEventListener('click', function () { hide($('edit-modal')); });

  document.querySelectorAll('input[name="filter"]').forEach(function (r) {
    r.addEventListener('change', function () {
      filter = document.querySelector('input[name="filter"]:checked').value;
      renderDomains();
    });
  });

  $('settings-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var keyInput = $('s-key').value.trim();
    var body = {
      notify_email: $('s-notify').value.trim(),
      from_email: $('s-from').value.trim()
    };
    // 仅当 API Key 输入框有变化（且非空）时才提交新值；留空或未改动则保留旧值
    if (keyInput && keyInput !== settings.resend_api_key_masked) {
      body.resend_api_key = keyInput;
    }
    api('/api/settings', 'PUT', body).then(function (r) {
      if (r.ok) {
        settings = r.data.settings || settings;
        renderSettings();
        msg($('settings-msg'), '已保存');
      } else {
        msg($('settings-msg'), r.data && r.data.error ? r.data.error : '保存失败', true);
      }
    });
  });

  $('test-email-btn').addEventListener('click', function () {
    api('/api/test-email', 'POST').then(function (r) {
      if (r.ok) msg($('settings-msg'), r.data.message || '测试邮件已发送');
      else msg($('settings-msg'), r.data && r.data.error ? r.data.error : '发送失败', true);
    });
  });

  checkAuth();
})();
</script>
</body>
</html>`;
