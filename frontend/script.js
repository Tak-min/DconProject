document.addEventListener('DOMContentLoaded', () => {

    console.log('[Debug] DOMContentLoaded: スクリプトの読み込みを開始します。');
    const appState = {
        conversationData: [],
        currentConversationId: null,
    };

    // =================================================================
    // --- 1. API仕様書準拠のダミーデータと通信モック ---
    // =================================================================

    const dummyApiData = {
        localHistory: [
            {
                "conversation_id": "conv_xyz789",
                "start_time": "2025-05-23T16:23:00Z",
                "end_time": "2025-05-23T16:28:30Z",
                "logs": [
                    { "id": "hist_abc123", "sender": "user", "message": "今日の晩御飯、何にしようかな？", "timestamp": "2025-05-23T16:23:05Z" },
                    { "id": "hist_def456", "sender": "ai", "message": "最近、麻婆豆腐はいかがですか？ピリ辛でご飯が進みますよ。", "timestamp": "2025-05-23T16:23:15Z" },
                    { "id": "hist_ghi789", "sender": "user", "message": "いいね！それにしよう。材料は何が必要だっけ？", "timestamp": "2025-05-23T16:24:00Z" }
                ]
            },
            {
                "conversation_id": "conv_pdq111",
                "start_time": "2025-05-22T08:02:00Z",
                "end_time": "2025-05-22T08:05:00Z",
                "logs": [
                    { "id": "hist_jkl111", "sender": "user", "message": "明日のクライアントとの打ち合わせ、資料の準備は大丈夫かな…", "timestamp": "2025-05-22T08:02:10Z" },
                    { "id": "hist_mno222", "sender": "ai", "message": "はい、主要なデータは全て揃っています。特に強調すべきポイントをまとめたサマリーを作成しましょうか？", "timestamp": "2025-05-22T08:02:45Z" }
                ]
            }
        ],
        sentHistory: [
            {
                "cloud_conversation_id": "cloud-conv-aaa-001",
                "employee_id": "emp-123",
                "device_id": "device-001",
                "summary": "金曜日の夕食を麻婆豆腐にすることを決定した会話。",
                "start_time": "2025-05-23T16:23:00Z",
                "end_time": "2025-05-23T16:28:30Z",
            },
            {
                "cloud_conversation_id": "cloud-conv-bbb-002",
                "employee_id": "emp-123",
                "device_id": "device-001",
                "summary": "明日の打ち合わせの最終確認と不安について話した。",
                "start_time": "2025-05-22T08:02:00Z",
                "end_time": "2025-05-22T08:05:00Z",
            }
        ],
        deviceStatus: {
            "device_id": "device-001",
            "device_status": "online",
            "network_connected": true,
            "ai_ready": true,
            "message": "デバイスは正常に動作中です。"
        },
        recommendation: {
            "conversation_id": "conv_xyz789",
            "summary": "今日の晩御飯についてAIと相談し、麻婆豆腐を作ることに決定しました。ユーザーは楽しみにしている様子でした。",
            "start_time": "2025-05-23T16:23:00Z",
        }
    };

    /**
     * API通信を模倣する非同期関数
     * @param {string} url - リクエスト先のURL
     * @param {object} options - fetchに渡すオプション
     * @returns {Promise<Response>} - fetchのレスポンスと同様のPromise
     */
    async function mockFetch(url, options = {}) {
        console.log(`[MockFetch] Request to: ${url}`, options);
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200)); // 200-700msの遅延

        const urlPath = url.split('?')[0];

        // 認証を模倣
        if (!localStorage.getItem('accessToken')) {
             if (urlPath !== '/token' && urlPath !== '/register') {
                return new Response(JSON.stringify({ code: "AUTH_UNAUTHORIZED", message: "認証情報が無効です。" }), { status: 401, headers: { 'Content-Type': 'application/json' } });
            }
        }
        
        switch (urlPath) {
            case '/token':
                return new Response(JSON.stringify({ access_token: "dummy-token-12345", token_type: "bearer" }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            case '/register':
                return new Response(JSON.stringify({ message: "User created successfully" }), { status: 201, headers: { 'Content-Type': 'application/json' } });
            case '/history':
                return new Response(JSON.stringify(dummyApiData.localHistory), { status: 200, headers: { 'Content-Type': 'application/json' } });
            case '/company/histories':
                return new Response(JSON.stringify(dummyApiData.sentHistory), { status: 200, headers: { 'Content-Type': 'application/json' } });
            case '/status':
                return new Response(JSON.stringify(dummyApiData.deviceStatus), { status: 200, headers: { 'Content-Type': 'application/json' } });
            case '/recommendation':
                 return new Response(JSON.stringify(dummyApiData.recommendation), { status: 200, headers: { 'Content-Type': 'application/json' } });
            case '/company/approved-histories':
                 return new Response(JSON.stringify({ status: "success", message: "許可済み会話履歴を保存しました。", received_conversation_count: 1, received_log_count: JSON.parse(options.body).conversations[0].logs.length }), { status: 201, headers: { 'Content-Type': 'application/json' } });
            default:
                return new Response(JSON.stringify({ code: "RESOURCE_NOT_FOUND", message: "要求されたリソースが見つかりません。" }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }
    }


    // =================================================================
    // --- 2. アプリケーションのコアロジック ---
    // =================================================================

    const elements = {
        screens: document.querySelectorAll('.screen'),
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        showRegisterBtn: document.getElementById('show-register-btn'),
        showLoginBtn: document.getElementById('show-login-btn'),
        loginErrorMessage: document.getElementById('login-error-message'),
        registerErrorMessage: document.getElementById('register-error-message'),
        recommendationCard: document.querySelector('.recommendation-box'),
        localHistoryList: document.querySelector('.local-history-list'),
        sentHistoryList: document.querySelector('.sent-history-list'),
        chatLogArea: document.getElementById('chatLogArea'),
        conversationLogTitle: document.getElementById('conversationLogTitle'),
        deviceStatusCard: document.querySelector('.device-status-card'),
        logoutBtn: document.getElementById('logout-btn'),
        sideMenu: document.getElementById('sideMenu'),
        hamburgerIcon: document.getElementById('recSideMenuTrigger'),
        closeMenuBtn: document.querySelector('.close-menu-btn'),
        navLinks: document.querySelectorAll('[data-target-screen]'),
        settingsEmployeeId: document.getElementById('settings-employee-id'),
        changePasswordBtn: document.getElementById('change-password-btn'),
        registerAvatarInput: document.getElementById('register-avatar'),
        registerAvatarPreview: document.getElementById('register-avatar-preview'),
        settingsAvatarContainer: document.getElementById('settings-avatar-container'),
        settingsAvatar: document.getElementById('settings-avatar'),
        avatarUploadInput: document.getElementById('avatar-upload-input'),
        sendConversationBtn: document.getElementById('send-conversation-btn'),
    };

    function showScreen(screenId) {
        elements.screens.forEach(screen => {
            screen.classList.toggle('active', screen.id === screenId);
        });
        const contentArea = document.getElementById('content-area');
        const sideMenu = document.getElementById('sideMenu');
        const isAuthScreen = screenId === 'login-screen' || screenId === 'register-screen';
        
        if (window.innerWidth >= 768) { // PC表示の場合
             if (contentArea) contentArea.style.display = isAuthScreen ? 'none' : 'flex';
             if (sideMenu) sideMenu.style.display = isAuthScreen ? 'none' : 'block';
        } else { // スマホ表示の場合
             if (contentArea) contentArea.style.display = isAuthScreen ? 'none' : 'block';
             if (sideMenu) sideMenu.style.display = 'block'; // スマホでは常にblockだが、activeクラスで表示制御
        }
    }

    function handleNavigation(screenId) {
        console.log(`[Debug] handleNavigation: 「${screenId}」への遷移を開始します。`);
        showScreen(screenId);
        switch (screenId) {
            case 'recommendation-screen': loadRecommendation(); break;
            case 'history-list-screen': loadLocalHistory(); break;
            case 'sent-history-list-screen': loadSentHistory(); break;
            case 'settings-screen': 
                loadUserSettings();
                loadDeviceStatus(); 
                break;
        }
    }

    function loadUserSettings() {
        if (!elements.settingsEmployeeId) return;
        const employeeId = localStorage.getItem('employeeId');
        elements.settingsEmployeeId.textContent = employeeId || '取得エラー';
        const avatarUrl = localStorage.getItem('userAvatar');
        if (elements.settingsAvatar) {
            elements.settingsAvatar.src = avatarUrl || './default-avatar.png';
        }
    }

    async function loadRecommendation() {
        if (!elements.recommendationCard) return;
        try {
            const response = await mockFetch('/recommendation');
            if (!response.ok) throw new Error('おすすめの取得に失敗');
            const data = await response.json();
            const cardDate = new Date(data.start_time).toLocaleDateString('ja-JP');
            elements.recommendationCard.innerHTML = `<div class="conversation-summary-card" data-conversation-id="${data.conversation_id}"><div class="card-header"><span class="card-date">${cardDate}</span></div><p class="card-summary-text">${data.summary}</p></div>`;
        } catch (error) {
            elements.recommendationCard.innerHTML = `<p class="error-message">${error.message}</p>`;
        }
    }

    async function loadLocalHistory() {
        if (!elements.localHistoryList) return;
        try {
            const response = await mockFetch('/history');
            if (!response.ok) throw new Error('ローカル履歴の取得に失敗');
            const data = await response.json();
            appState.conversationData = data;
            elements.localHistoryList.innerHTML = '';
            if (data.length === 0) {
                elements.localHistoryList.innerHTML = '<p style="text-align: center; color: #777;">会話履歴はありません。</p>';
                return;
            }
            data.forEach(conv => {
                const previewText = conv.logs.length > 0 ? `${conv.logs[0].sender}: ${conv.logs[0].message}` : 'ログがありません';
                const startTime = new Date(conv.start_time).toLocaleString('ja-JP');
                const listItem = document.createElement('li');
                listItem.className = 'history-item';
                listItem.dataset.conversationId = conv.conversation_id;
                listItem.innerHTML = `<div class="history-item-header"><span class="history-item-id">ID: ${conv.conversation_id}</span></div><p class="history-item-preview">${previewText}</p><div class="history-item-footer"><span class="history-item-datetime">開始: ${startTime}</span></div>`;
                elements.localHistoryList.appendChild(listItem);
            });
        } catch (error) {
            elements.localHistoryList.innerHTML = `<p class="error-message">${error.message}</p>`;
        }
    }

    async function loadSentHistory() {
        if (!elements.sentHistoryList) return;
        try {
            const response = await mockFetch('/company/histories');
            if (!response.ok) throw new Error('送信済み履歴の取得に失敗');
            const data = await response.json();
            elements.sentHistoryList.innerHTML = '';
            if (data.length === 0) {
                elements.sentHistoryList.innerHTML = '<p style="text-align: center; color: #777;">送信済みの履歴はありません。</p>';
                return;
            }
            data.forEach(item => {
                const listItem = document.createElement('li');
                listItem.className = 'history-item';
                listItem.innerHTML = `
                    <div class="history-item-header">
                        <span class="history-item-id">ID: ${item.cloud_conversation_id}</span>
                        <span class="history-item-employee">社員ID: ${item.employee_id}</span>
                    </div>
                    <h4 class="history-item-summary">${item.summary}</h4>
                    <div class="history-item-footer">
                        <span class="history-item-datetime">送信日時: ${new Date(item.start_time).toLocaleString('ja-JP')}</span>
                    </div>`;
                elements.sentHistoryList.appendChild(listItem);
            });
        } catch (error) {
            elements.sentHistoryList.innerHTML = `<p class="error-message">${error.message}</p>`;
        }
    }

    function displayConversationLogs(conversationId) {
        appState.currentConversationId = conversationId;
        const conversation = appState.conversationData.find(c => c.conversation_id === conversationId);
        if (!conversation) {
            alert('会話データが見つかりません。');
            return;
        }
        elements.conversationLogTitle.textContent = `会話ログ: ${conversationId}`;
        elements.chatLogArea.innerHTML = '';
        conversation.logs.forEach(log => {
            const logEntry = document.createElement('div');
            logEntry.className = `chat-bubble-entry ${log.sender === 'user' ? 'align-right' : ''}`;
            logEntry.innerHTML = `
                <div class="chat-bubble-meta">
                    <span class="sender">${log.sender}</span> 
                    <span class="timestamp">${new Date(log.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div class="chat-bubble ${log.sender}">${log.message}</div>`;
            elements.chatLogArea.appendChild(logEntry);
        });
        handleNavigation('conversation-log-screen');
    }

    async function loadDeviceStatus() {
        if (!elements.deviceStatusCard) return;
        try {
            const response = await mockFetch('/status');
            if (!response.ok) throw new Error('状態取得エラー');
            const data = await response.json();
            const statusTextEl = elements.deviceStatusCard.querySelector('.status-text');
            const statusDetailEl = elements.deviceStatusCard.querySelector('.status-detail');
            const statusIndicatorEl = statusTextEl.querySelector('.span.status-indicator');

            statusIndicatorEl.className = `status-indicator ${data.device_status}`;
            statusTextEl.childNodes[1].nodeValue = ` ${data.device_status.charAt(0).toUpperCase() + data.device_status.slice(1)}`;
            statusDetailEl.textContent = data.ai_ready ? 'AI準備OK' : 'AI準備中';
        } catch (error) {
            elements.deviceStatusCard.querySelector('.status-text').textContent = '状態取得不可';
        }
    }
    
    function setupEventListeners() {
        if (elements.showRegisterBtn) {
            elements.showRegisterBtn.addEventListener('click', (e) => { e.preventDefault(); handleNavigation('register-screen'); });
        }
        if (elements.showLoginBtn) {
            elements.showLoginBtn.addEventListener('click', (e) => { e.preventDefault(); handleNavigation('login-screen'); });
        }

        if (elements.loginForm) {
            elements.loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                elements.loginErrorMessage.textContent = '';
                try {
                    const response = await mockFetch('/token', { method: 'POST' });
                    if (!response.ok) throw new Error('ログインに失敗しました。');
                    const data = await response.json();
                    localStorage.setItem('accessToken', data.access_token);
                    localStorage.setItem('employeeId', e.target.employee_id.value);
                    alert('ログインしました！');
                    handleNavigation('recommendation-screen');
                } catch (error) {
                    elements.loginErrorMessage.textContent = error.message;
                }
            });
        }

        if (elements.registerForm) {
            elements.registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const avatarSrc = elements.registerAvatarPreview.src;
                if (avatarSrc && !avatarSrc.endsWith('default-avatar.png')) {
                    localStorage.setItem('userAvatar', avatarSrc);
                } else {
                    localStorage.removeItem('userAvatar');
                }
                alert('登録が完了しました。ログインしてください。');
                handleNavigation('login-screen');
            });
        }
        
        if (elements.localHistoryList) {
            elements.localHistoryList.addEventListener('click', (e) => {
                const listItem = e.target.closest('.history-item');
                if (listItem && listItem.dataset.conversationId) {
                    displayConversationLogs(listItem.dataset.conversationId);
                }
            });
        }
        
        if (elements.sendConversationBtn) {
             elements.sendConversationBtn.addEventListener('click', async () => {
                if (!appState.currentConversationId) return alert('送信対象の会話が選択されていません。');
                const conversation = appState.conversationData.find(c => c.conversation_id === appState.currentConversationId);
                if (!conversation) return alert('会話データが見つかりません。');
                const employeeId = localStorage.getItem('employeeId');

                const requestBody = {
                    employee_id: employeeId,
                    device_id: "device-001",
                    conversations: [{
                        conversation_id: conversation.conversation_id,
                        summary: `「${conversation.logs[0].message.substring(0, 10)}...」に関する会話。`,
                        start_time: conversation.start_time,
                        end_time: conversation.end_time,
                        logs: conversation.logs.map(log => ({
                            local_id: log.id,
                            sender: log.sender,
                            message: log.message,
                            timestamp: log.timestamp
                        }))
                    }]
                };

                try {
                    const response = await mockFetch('/company/approved-histories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
                    if (!response.ok) throw new Error('会話の送信に失敗しました。');
                    const result = await response.json();
                    alert(result.message);
                    handleNavigation('history-list-screen');
                } catch (error) {
                     alert(error.message);
                }
            });
        }

        if (elements.logoutBtn) {
            elements.logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('employeeId');
                localStorage.removeItem('userAvatar');
                alert('ログアウトしました。');
                handleNavigation('login-screen');
            });
        }

        if (elements.hamburgerIcon) elements.hamburgerIcon.addEventListener('click', () => elements.sideMenu.classList.add('active'));
        if (elements.closeMenuBtn) elements.closeMenuBtn.addEventListener('click', () => elements.sideMenu.classList.remove('active'));
        if (elements.sideMenu) elements.sideMenu.addEventListener('click', (e) => { if (e.target === elements.sideMenu) elements.sideMenu.classList.remove('active'); });
        
        elements.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetScreen = link.dataset.targetScreen;
                if (targetScreen) handleNavigation(targetScreen);
                if (elements.sideMenu.classList.contains('active')) elements.sideMenu.classList.remove('active');
            });
        });
        
        document.querySelectorAll('.password-toggle').forEach(toggle => {
             toggle.addEventListener('click', (e) => {
                const iconContainer = e.currentTarget;
                const passwordInput = iconContainer.previousElementSibling;
                if (!passwordInput) return;
                const eyeIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
                const eyeOffIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    iconContainer.innerHTML = eyeOffIconSVG;
                } else {
                    passwordInput.type = 'password';
                    iconContainer.innerHTML = eyeIconSVG;
                }
            });
        });

        if (elements.registerAvatarInput) {
            elements.registerAvatarInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && elements.registerAvatarPreview) {
                    const reader = new FileReader();
                    reader.onload = (event) => { elements.registerAvatarPreview.src = event.target.result; };
                    reader.readAsDataURL(file);
                }
            });
        }

        if (elements.settingsAvatarContainer) {
            elements.settingsAvatarContainer.addEventListener('click', () => {
                if (elements.avatarUploadInput) elements.avatarUploadInput.click();
            });
        }
        
        if (elements.avatarUploadInput) {
            elements.avatarUploadInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const imageUrl = event.target.result;
                        if (elements.settingsAvatar) elements.settingsAvatar.src = imageUrl;
                        localStorage.setItem('userAvatar', imageUrl);
                        alert('アイコンを更新しました。');
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    }

    function initializeApp() {
        console.log('[Debug] initializeApp: アプリケーションの初期化を開始します。');
        setupEventListeners();
        const token = localStorage.getItem('accessToken');
        if (token) {
            handleNavigation('recommendation-screen');
        } else {
            handleNavigation('login-screen');
        }
    }

    initializeApp();
});