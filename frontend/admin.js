/**
 * 數獨安全防護管理系統 v2.0 - 後台控制面板交互邏輯 (admin.js)
 * 整合安全身分驗證、即時數據看板、用戶權限狀態管理、高階日誌過濾與系統維護切換
 */

let currentUser = null;
let allUsersData = [];
let allLogsData = [];
let showSuspiciousOnly = false;

// 1. 初始化身分驗證與頁面加載
document.addEventListener('DOMContentLoaded', async () => {
    // 定時更新 live-timer
    updateLiveTimer();
    setInterval(updateLiveTimer, 30000);

    // 🔒 載入身分安全校正
    await checkAdminAuth();
});

function updateLiveTimer() {
    const timer = document.getElementById('live-timer');
    if (timer) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const date = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        timer.textContent = `🕒 伺服器時間：${year}-${month}-${date} ${hours}:${minutes}`;
    }
}

async function checkAdminAuth() {
    try {
        const response = await fetch('../backend/check_session.php');
        const data = await response.json();
        
        if (data.logged_in && data.role === 'admin') {
            currentUser = {
                id: data.user_id,
                username: data.username,
                role: data.role
            };
            
            // 填入管理員名稱
            document.getElementById('admin-name').textContent = currentUser.username;
            
            // 開始加載後台主控數據
            await fetchAdminData();
        } else {
            // 越權警告：直接引導回前台
            alert('🔒 安全系統提示：此區域受嚴密防護，僅限管理員登入。請先登入管理員帳號！');
            window.location.href = 'index.html';
        }
    } catch (e) {
        console.error(e);
        alert('身分驗證異常，已安全退回首頁。');
        window.location.href = 'index.html';
    }
}

// 2. 切換分頁邏輯
function switchTab(tabId) {
    // 移除所有導覽按鈕 active
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    // 隱藏所有分頁 content
    document.querySelectorAll('.admin-tab-content').forEach(el => el.classList.add('hidden'));
    
    // 設定當前 active
    document.getElementById(`nav-${tabId}`).classList.add('active');
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    
    // 更新 Header Title & Description
    const titleEl = document.getElementById('view-title');
    const descEl = document.getElementById('view-desc');
    
    if (tabId === 'dashboard') {
        titleEl.textContent = '控制台總覽';
        descEl.textContent = '即時監控系統運行狀態、註冊人數與安全事件日誌。';
    } else if (tabId === 'users') {
        titleEl.textContent = '用戶權限管理';
        descEl.textContent = '檢視所有註冊玩家、修改玩家角色、啟用/停用帳戶、重設安全登入密碼。';
    } else if (tabId === 'logs') {
        titleEl.textContent = '安全審計日誌';
        descEl.textContent = '高階追蹤反作弊分析與安全攔截日誌，支援多條件即時過濾與關鍵字檢索。';
    }
}

// 3. 拉取後端資料
async function fetchAdminData() {
    try {
        const response = await fetch('../backend/admin_dashboard.php?action=get_data');
        if (response.status === 403) {
            alert('存取拒絕，您的登入逾時或權限已被變更。');
            window.location.href = 'index.html';
            return;
        }
        
        const data = await response.json();
        if (data.success) {
            // A. 填充數據看版
            document.getElementById('stat-users').textContent = data.stats.total_users;
            document.getElementById('stat-games').textContent = data.stats.total_games;
            document.getElementById('stat-cheats').textContent = data.stats.total_cheats;
            
            // B. 更新維護模式狀態
            const isMaint = parseInt(data.maintenance_mode) === 1;
            const toggleSwitch = document.getElementById('maintenance-toggle-switch');
            const badge = document.getElementById('maintenance-badge');
            const label = document.getElementById('toggle-label-text');
            
            if (toggleSwitch) toggleSwitch.checked = isMaint;
            if (badge) {
                badge.textContent = isMaint ? '⚠️ 系統維護中' : '🟢 系統正常運作';
                badge.className = isMaint ? 'maintenance-status-badge active' : 'maintenance-status-badge';
            }
            if (label) {
                label.textContent = isMaint ? '維護模式：開啟' : '維護模式：關閉';
                label.className = isMaint ? 'toggle-text active' : 'toggle-text';
            }
            
            // C. 儲存用戶與日誌，並渲染
            allUsersData = data.users;
            allLogsData = data.logs;
            
            renderUsersTable(allUsersData);
            renderLogsTable(allLogsData);
        } else {
            alert(data.message || '獲取主控台數據失敗。');
        }
    } catch (e) {
        console.error(e);
        alert('網路連線或伺服器異常，無法更新後台數據。');
    }
}

// 4. 渲染用戶管理表格
function renderUsersTable(users) {
    const tbody = document.getElementById('users-table-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:30px;">找不到相符的用戶資料。</td></tr>`;
        return;
    }
    
    users.forEach(user => {
        const tr = document.createElement('tr');
        
        // 角色徽章
        let roleClass = 'role-standard';
        let roleText = '普通玩家';
        if (user.role === 'admin') {
            roleClass = 'role-admin';
            roleText = '管理員';
        } else if (user.role === 'power') {
            roleClass = 'role-power';
            roleText = '資深玩家';
        }
        
        // 狀態徽章
        let statusClass = 'status-active';
        let statusText = '🟢 正常啟用';
        if (user.status === 'suspended') {
            statusClass = 'status-suspended';
            statusText = '🔴 停用中';
        } else if (user.status === 'blocked') {
            statusClass = 'status-blocked';
            statusText = '🚫 已封鎖';
        }
        
        // 角色修改選單 (防止管理員自我降權)
        const isSelf = currentUser && currentUser.id === parseInt(user.id);
        let selectHTML = '';
        if (isSelf) {
            selectHTML = `<span class="self-lock-text">🔒 (目前登入帳戶，防自我降權)</span>`;
        } else {
            selectHTML = `
                <select class="admin-role-select" onchange="changeUserRole(${user.id}, this.value)">
                    <option value="standard" ${user.role === 'standard' ? 'selected' : ''}>普通玩家</option>
                    <option value="power" ${user.role === 'power' ? 'selected' : ''}>資深玩家</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>管理員</option>
                </select>
            `;
        }
        
        // 操作按鈕 (防止管理員自我停用)
        let actionsHTML = '';
        if (isSelf) {
            actionsHTML = `<span style="color:var(--text-muted); font-size:12px;">無管理操作</span>`;
        } else {
            const isSuspended = user.status === 'suspended';
            const toggleStatusBtn = isSuspended
                ? `<button class="action-btn status-btn activate-btn" onclick="changeUserStatus(${user.id}, 'active')">🔓 啟用</button>`
                : `<button class="action-btn status-btn deactivate-btn" onclick="changeUserStatus(${user.id}, 'suspended')">🔒 停用</button>`;
            
            actionsHTML = `
                <div class="table-actions-row">
                    ${toggleStatusBtn}
                    <button class="action-btn pwd-btn" onclick="openPasswordModal(${user.id}, '${user.username}')">🔑 重設密碼</button>
                </div>
            `;
        }
        
        tr.innerHTML = `
            <td>${user.id}</td>
            <td style="font-weight: 700; color: #1e293b;">${user.username}</td>
            <td><span class="user-role-badge ${roleClass}">${roleText}</span></td>
            <td><span class="user-status-badge ${statusClass}">${statusText}</span></td>
            <td>${selectHTML}</td>
            <td>${actionsHTML}</td>
        `;
        tbody.appendChild(tr);
    });
}

function filterUsersTable() {
    const q = document.getElementById('user-search-input').value.toLowerCase().trim();
    const filtered = allUsersData.filter(u => u.username.toLowerCase().includes(q));
    renderUsersTable(filtered);
}

// 5. 變更使用者角色
async function changeUserRole(userId, newRole) {
    if (!confirm('⚡ 安全性提示：您確定要更新此玩家的角色權限嗎？這將直接影響其前台操作功能。')) {
        await fetchAdminData();
        return;
    }
    
    try {
        const response = await fetch('../backend/admin_dashboard.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({
                action: 'update_role',
                target_user_id: userId,
                new_role: newRole
            })
        });
        
        const data = await response.json();
        if (data.success) {
            alert('🎉 角色權限已成功更新！');
            await fetchAdminData();
        } else {
            alert(data.message || '角色更新失敗。');
            await fetchAdminData();
        }
    } catch (e) {
        alert('網路異常，無法變更用戶角色。');
        await fetchAdminData();
    }
}

// 6. 變更帳戶狀態 (啟用/停用)
async function changeUserStatus(userId, newStatus) {
    const actStr = newStatus === 'active' ? '【重新啟用】' : '【暫時停用】';
    if (!confirm(`🚨 您確定要 ${actStr} 此用戶的帳戶嗎？停用後該用戶將立刻被強制踢下線，且無法再次登入！`)) {
        return;
    }
    
    try {
        const response = await fetch('../backend/admin_dashboard.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({
                action: 'update_status',
                target_user_id: userId,
                new_status: newStatus
            })
        });
        
        const data = await response.json();
        if (data.success) {
            alert('✅ 帳戶狀態已成功更新！');
            await fetchAdminData();
        } else {
            alert(data.message || '狀態變更失敗。');
        }
    } catch (e) {
        alert('網路異常，無法變更用戶狀態。');
    }
}

// 7. 重設密碼 Modal 控制
function openPasswordModal(userId, username) {
    document.getElementById('modal-target-username').textContent = username;
    document.getElementById('modal-target-userid').value = userId;
    document.getElementById('modal-new-password').value = '';
    
    const modal = document.getElementById('password-modal');
    if (modal) modal.classList.add('show');
}

function closePasswordModal() {
    const modal = document.getElementById('password-modal');
    if (modal) modal.classList.remove('show');
}

async function submitPasswordReset() {
    const userId = parseInt(document.getElementById('modal-target-userid').value);
    const newPwd = document.getElementById('modal-new-password').value.trim();
    
    if (!newPwd || newPwd.length < 4) {
        alert('❌ 密碼設定失敗：密碼長度最少必須為 4 位字元！');
        return;
    }
    
    try {
        const response = await fetch('../backend/admin_dashboard.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({
                action: 'reset_password',
                target_user_id: userId,
                new_password: newPwd
            })
        });
        
        const data = await response.json();
        if (data.success) {
            alert('🎉 該用戶的密碼已成功重新設定，新密碼已即時生效！');
            closePasswordModal();
            await fetchAdminData();
        } else {
            alert(data.message || '重設密碼失敗。');
        }
    } catch (e) {
        alert('網路異常，無法重設用戶密碼。');
    }
}

// 8. 系統一鍵維護模式控制
async function toggleMaintenanceMode(isChecked) {
    const actStr = isChecked ? '【啟用】' : '【關閉】';
    if (!confirm(`⚠️ 警報警告：您確定要 ${actStr} 全系統維護模式嗎？\n開啟後，所有非管理員的玩家登入時都會被阻斷！`)) {
        document.getElementById('maintenance-toggle-switch').checked = !isChecked;
        return;
    }
    
    try {
        const response = await fetch('../backend/admin_dashboard.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({
                action: 'toggle_maintenance',
                maintenance: isChecked ? 1 : 0
            })
        });
        
        const data = await response.json();
        if (data.success) {
            alert(data.message);
            await fetchAdminData();
        } else {
            alert(data.message || '維護模式更新失敗。');
            document.getElementById('maintenance-toggle-switch').checked = !isChecked;
        }
    } catch (e) {
        alert('網路異常，無法變更維護模式。');
        document.getElementById('maintenance-toggle-switch').checked = !isChecked;
    }
}

// 9. 渲染安全審計日誌
function renderLogsTable(logs) {
    const tbody = document.getElementById('logs-table-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:30px;">查無任何符合條件的日誌紀錄。</td></tr>`;
        return;
    }
    
    logs.forEach(log => {
        const tr = document.createElement('tr');
        const isSus = parseInt(log.is_suspicious) === 1;
        if (isSus) {
            tr.className = 'log-row-suspicious';
        }
        
        const timeStr = log.created_at;
        const userStr = log.username ? log.username : '<span style="color:var(--text-muted);">系統訪客/遊客</span>';
        
        // 行為徽章
        let badgeHTML = '';
        if (isSus) {
            badgeHTML = `<span class="log-badge log-badge-suspicious">⚠️ ${log.action}</span>`;
        } else {
            badgeHTML = `<span class="log-badge log-badge-normal">${log.action}</span>`;
        }
        
        // 解析詳情
        let detailsText = '';
        try {
            const parsed = JSON.parse(log.details);
            detailsText = Object.entries(parsed).map(([k, v]) => `<span class="json-k">${k}:</span> <span class="json-v">${typeof v === 'object' ? JSON.stringify(v) : v}</span>`).join(' | ');
        } catch (e) {
            detailsText = log.details || '';
        }
        
        tr.innerHTML = `
            <td style="white-space:nowrap; color:var(--text-muted); font-size:11px;">${timeStr}</td>
            <td style="font-weight:700; color:#475569;">${userStr}</td>
            <td>${badgeHTML}</td>
            <td>
                <div class="log-ip-badge">IP: ${log.ip_address || 'unknown'}</div>
                <div class="log-details-block">${detailsText}</div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 10. 高階多條件日誌過濾器
function filterLogs() {
    const userQ = document.getElementById('filter-log-user').value.toLowerCase().trim();
    const actionQ = document.getElementById('filter-log-action').value;
    const startQ = document.getElementById('filter-log-start').value;
    const endQ = document.getElementById('filter-log-end').value;
    
    let filtered = allLogsData;
    
    // A. 僅顯示異常
    if (showSuspiciousOnly) {
        filtered = filtered.filter(l => parseInt(l.is_suspicious) === 1);
    }
    
    // B. 搜尋使用者名稱
    if (userQ) {
        filtered = filtered.filter(l => {
            const name = l.username ? l.username.toLowerCase() : '系統';
            return name.includes(userQ);
        });
    }
    
    // C. 篩選行為類型
    if (actionQ !== 'all') {
        filtered = filtered.filter(l => l.action === actionQ);
    }
    
    // D. 時間範圍篩選 (起)
    if (startQ) {
        const startDate = new Date(startQ + 'T00:00:00');
        filtered = filtered.filter(l => {
            const logDate = new Date(l.created_at);
            return logDate >= startDate;
        });
    }
    
    // E. 時間範圍篩選 (迄)
    if (endQ) {
        const endDate = new Date(endQ + 'T23:59:59');
        filtered = filtered.filter(l => {
            const logDate = new Date(l.created_at);
            return logDate <= endDate;
        });
    }
    
    renderLogsTable(filtered);
}

function toggleSuspiciousLogsFilter() {
    showSuspiciousOnly = !showSuspiciousOnly;
    const btn = document.getElementById('btn-sus-logs');
    if (btn) {
        btn.classList.toggle('active', showSuspiciousOnly);
        btn.textContent = showSuspiciousOnly ? '顯示全部日誌 📝' : '僅顯示異常 ⚠️';
    }
    filterLogs();
}
