document.addEventListener('DOMContentLoaded', () => {

    console.log('[Debug] DOMContentLoaded: スクリプトの読み込みを開始します。');

    // --- 1. グローバル変数とDOM要素の取得 ---
    const appState = {
        conversationData: [],
        currentConversationId: null,
    };

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
        sendConversationBtn: document.getElementById('send-conversation-btn'),
        logoutBtn: document.getElementById('logout-btn'),
        sideMenu: document.getElementById('sideMenu'),
        hamburgerIcon: document.getElementById('recSideMenuTrigger'),
        closeMenuBtn: document.querySelector('.close-menu-btn'),
        navLinks: document.querySelectorAll('[data-target-screen]'),
        settingsEmployeeId: document.getElementById('settings-employee-id'),
        changePasswordBtn: document.getElementById('change-password-btn'),
    };


    // --- 2. コア機能の関数 ---

    /**
     * 認証トークン付きでAPI通信を行い、認証エラーを自動処理する
     */
    async function authFetch(url, options = {}) {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            handleNavigation('login-screen');
            throw new Error('Not authenticated');
        }
        const headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
        try {
            const response = await fetch(url, { ...options, headers });
            if (response.status === 401) {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('employeeId');
                alert('セッションが切れました。再度ログインしてください。');
                handleNavigation('login-screen');
                throw new Error('Session expired');
            }
            return response;
        } catch (error) {
            console.error(`[Error] Fetch failed for ${url}:`, error);
            // ネットワークエラーなどを捕捉
            throw new Error('ネットワーク接続に問題があるか、サーバーが応答していません。');
        }
    }

    /**
     * 指定IDの画面を表示する（表示切り替えに専念）
     */
    function showScreen(screenId) {
        elements.screens.forEach(screen => {
            screen.classList.toggle('active', screen.id === screenId);
        });
    }

    /**
     * 画面遷移とデータ読み込みを管理する司令塔
     */
    function handleNavigation(screenId) {
        console.log(`[Debug] handleNavigation: 「${screenId}」への遷移を開始します。`);

        const sideMenu = document.getElementById('sideMenu');
        const contentArea = document.getElementById('content-area');
        if (screenId === 'login-screen' || screenId === 'register-screen') {
            // ログイン画面表示時は、サイドバーとコンテンツエリアを非表示にする
            if (sideMenu) sideMenu.style.display = 'none';
            if (contentArea) contentArea.style.display = 'none';
        } else {
            // それ以外の画面では、サイドバーとコンテンツエリアを表示する
            if (sideMenu) sideMenu.style.display = ''; // CSSのデフォルトに戻す
            if (contentArea) contentArea.style.display = '';
        }

        showScreen(screenId);
        
        // 画面ごとに必要なデータを読み込む
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

    // --- 3. データ読み込み & レンダリング関数群 ---

    /**
     * ユーザー設定画面に情報を読み込む
     */
    function loadUserSettings() {
        if (!elements.settingsEmployeeId) return;

        // localStorageから社員IDを取得して表示
        const employeeId = localStorage.getItem('employeeId');
        if (employeeId) {
            elements.settingsEmployeeId.textContent = employeeId;
        } else {
            // 万が一IDが取得できなかった場合のフォールバック
            elements.settingsEmployeeId.textContent = '取得エラー';
        }
    }

    async function loadRecommendation() {
        if (!elements.recommendationCard) return;
        try {
            const response = await authFetch('/recommendation');
            if (!response.ok) throw new Error('おすすめの取得に失敗しました。');
            const data = await response.json();
            elements.recommendationCard.innerHTML = `<div class="conversation-summary-card"><div class="card-header"><span class="card-date">${data.date}</span><span class="card-id">${data.conversation_id}</span></div><p class="card-summary-text">${data.summary_text}</p><div class="card-tags">${data.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div></div>`;
        } catch (error) {
            if (error.message.includes('authenticated') || error.message.includes('expired')) return;
            elements.recommendationCard.innerHTML = `<p class="error-message">${error.message}</p>`;
        }
    }

    async function loadLocalHistory() {
        console.log('[Debug] loadLocalHistory: 処理を開始します。');
        if (!elements.localHistoryList) {
            console.error('[Error] 描画対象の "localHistoryList" がHTML内に見つかりません。');
            return;
        }

        try {
            console.log('[Debug] サーバーから履歴データを取得します...');
            const response = await authFetch('/history');
            console.log('[Debug] サーバーからの応答:', response.status);

            if (!response.ok) {
                throw new Error(`履歴の取得に失敗しました (ステータス: ${response.status})`);
            }

            const data = await response.json();
            console.log('[Debug] 取得したデータ:', data);
            appState.conversationData = data;
            
            elements.localHistoryList.innerHTML = ''; // 既存のリストをクリア

            if (!appState.conversationData || !Array.isArray(appState.conversationData)) {
                console.error('[Error] サーバーから受け取ったデータが配列ではありません。', appState.conversationData);
                throw new Error('サーバーから無効な形式のデータを受け取りました。');
            }

            if (appState.conversationData.length === 0) {
                console.log('[Debug] 表示する会話履歴はありません。');
                elements.localHistoryList.innerHTML = '<p style="text-align: center; color: #777;">会話履歴はありません。</p>';
                return;
            }

            console.log('[Debug] 画面への履歴の描画を開始します...');
            appState.conversationData.forEach((conv, index) => {
                if (!conv || typeof conv !== 'object') {
                    console.warn(`[Warning] ${index}番目の会話データが不正なためスキップします。`, conv);
                    return; 
                }

                const hasLogs = conv.logs && Array.isArray(conv.logs) && conv.logs.length > 0;
                const previewText = hasLogs
                    ? `${conv.logs[0].sender || '不明'}: ${conv.logs[0].message || 'メッセージなし'}`
                    : 'ログがありません';
                
                const startTime = conv.start_time ? new Date(conv.start_time).toLocaleString('ja-JP') : '日時不明';

                const listItem = document.createElement('li');
                listItem.className = 'history-item';
                listItem.dataset.conversationId = conv.conversation_id;
                
                listItem.innerHTML = `<div class="history-item-header"><span class="history-item-id">ID: ${conv.conversation_id || 'ID不明'}</span></div><p class="history-item-preview">${previewText}</p><div class="history-item-footer"><span class="history-item-datetime">開始: ${startTime}</span></div>`;
                elements.localHistoryList.appendChild(listItem);
            });
            console.log('[Debug] 描画が完了しました。');

        } catch (error) {
            console.error('[Error] loadLocalHistory 関数内でエラーが発生しました:', error);
            if (error.message.includes('authenticated') || error.message.includes('expired')) {
                return;
            }
            elements.localHistoryList.innerHTML = `<p class="error-message">エラーが発生しました: ${error.message}</p>`;
        }
    }
    
    async function loadSentHistory() {
        if (!elements.sentHistoryList) return;
        try {
            const response = await authFetch('/company/histories');
            if (!response.ok) throw new Error('送信済み履歴の取得に失敗しました。');
            const sentData = await response.json();
            elements.sentHistoryList.innerHTML = '';
            if (sentData.length === 0) {
                elements.sentHistoryList.innerHTML = '<p style="text-align: center; color: #777;">送信済みの履歴はありません。</p>';
                return;
            }
            sentData.forEach(item => {
                const listItem = document.createElement('li');
                listItem.className = 'history-item';
                listItem.innerHTML = `<div class="history-item-header"><span class="history-item-id">ID: ${item.cloud_conversation_id}</span></div><h4 class="history-item-summary">${item.summary}</h4><div class="history-item-footer"><span class="history-item-datetime">送信日時: ${new Date(item.start_time).toLocaleString('ja-JP')}</span></div>`;
                elements.sentHistoryList.appendChild(listItem);
            });
        } catch (error) {
            if (error.message.includes('authenticated') || error.message.includes('expired')) return;
            elements.sentHistoryList.innerHTML = `<p class="error-message">${error.message}</p>`;
        }
    }

    function displayConversationLogs(conversationId) {
        appState.currentConversationId = conversationId;
        const { chatLogArea, conversationLogTitle } = elements;
        if (!chatLogArea || !conversationLogTitle) return;
        const conversation = appState.conversationData.find(c => c.conversation_id === conversationId);
        if (!conversation) return;
        conversationLogTitle.textContent = `会話ログ: ${conversationId}`;
        chatLogArea.innerHTML = '';
        conversation.logs.forEach(log => {
            const logEntry = document.createElement('div');
            logEntry.className = 'chat-bubble-entry';
            logEntry.innerHTML = `<div class="chat-bubble-meta"><span class="sender">${log.sender}</span> <span class="timestamp">${new Date(log.timestamp).toLocaleTimeString('ja-JP')}</span></div><div class="chat-bubble ${log.sender}">${log.message}</div>`;
            chatLogArea.appendChild(logEntry);
        });
        handleNavigation('conversation-log-screen');
    }

    async function loadDeviceStatus() {
        if (!elements.deviceStatusCard) return;
        try {
            const response = await authFetch('/status');
            if (!response.ok) throw new Error('状態取得エラー');
            const data = await response.json();
            const statusText = elements.deviceStatusCard.querySelector('.status-text');
            const statusDetail = elements.deviceStatusCard.querySelector('.status-detail');
            const statusIndicator = statusText.querySelector('.status-indicator');
            statusIndicator.className = `status-indicator ${data.device_status}`;
            if (statusText.childNodes.length > 1) {
                statusText.childNodes[1].nodeValue = ` ${data.device_status.charAt(0).toUpperCase() + data.device_status.slice(1)}`;
            }
            statusDetail.textContent = data.ai_ready ? 'AI準備OK' : 'AI準備中';
        } catch (error) {
            if (error.message.includes('authenticated') || error.message.includes('expired')) return;
            elements.deviceStatusCard.querySelector('.status-text').textContent = '状態取得不可';
        }
    }
    
    // --- 4. イベントリスナーのセットアップ ---
    function setupEventListeners() {
        if (elements.loginForm) {
            elements.loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                elements.loginErrorMessage.textContent = '';
                const formData = new FormData(elements.loginForm);
                const urlSearchParams = new URLSearchParams();
                urlSearchParams.append('username', formData.get('employee_id'));
                urlSearchParams.append('password', formData.get('password'));
                try {
                    const response = await fetch('/token', { method: 'POST', body: urlSearchParams });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.detail || 'ログインに失敗しました。');
                    localStorage.setItem('accessToken', data.access_token);
                    localStorage.setItem('employeeId', formData.get('employee_id'));
                    handleNavigation('recommendation-screen');
                } catch (error) {
                    elements.loginErrorMessage.textContent = error.message;
                }
            });
        }

        if (elements.registerForm) {
            elements.registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                elements.registerErrorMessage.textContent = '';
                const formData = new FormData(elements.registerForm);
                const userData = Object.fromEntries(formData.entries());
                try {
                    const response = await fetch('/register/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userData) });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.detail || '登録に失敗しました。');
                    alert('登録が完了しました。ログインしてください。');
                    handleNavigation('login-screen');
                } catch (error) {
                    elements.registerErrorMessage.textContent = error.message;
                }
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
                const requestBody = { employee_id: "emp-XYZ", device_id: "device-001", conversations: [{ conversation_id: conversation.conversation_id, summary: conversation.preview, start_time: conversation.start_time, end_time: new Date().toISOString(), logs: conversation.logs.map(log => ({ local_id: log.id, sender: log.sender, message: log.message, timestamp: log.timestamp })) }] };
                try {
                    const response = await authFetch('/company/approved-histories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
                    if (!response.ok) throw new Error('会話の送信に失敗しました。');
                    const result = await response.json();
                    alert(result.message);
                    handleNavigation('history-list-screen');
                } catch (error) {
                    if (!error.message.includes('expired')) alert(error.message);
                }
            });
        }

        // --- ナビゲーション関連のイベント ---
        if (elements.logoutBtn) {
            elements.logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('employeeId');
                alert('ログアウトしました。');
                handleNavigation('login-screen');
            });
        }

        if (elements.hamburgerIcon) elements.hamburgerIcon.addEventListener('click', () => { elements.sideMenu.classList.add('active'); });
        if (elements.closeMenuBtn) elements.closeMenuBtn.addEventListener('click', () => { elements.sideMenu.classList.remove('active'); });
        if (elements.sideMenu) elements.sideMenu.addEventListener('click', (e) => { if (e.target === elements.sideMenu) elements.sideMenu.classList.remove('active'); });
        
        elements.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetScreen = link.dataset.targetScreen;
                if (targetScreen) {
                    handleNavigation(targetScreen);
                }
                if (elements.sideMenu && elements.sideMenu.contains(link)) {
                    elements.sideMenu.classList.remove('active');
                }
            });
        });

        // --- ▼▼▼ ここから変更 ▼▼▼ ---
        // 表示／非表示アイコンのSVGデータを定義
        const eyeIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        const eyeOffIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

        // パスワード表示切り替えのロジック
        document.querySelectorAll('.password-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const iconContainer = e.currentTarget;
                const passwordWrapper = iconContainer.closest('.password-wrapper');
                if (!passwordWrapper) return;
                
                const passwordInput = passwordWrapper.querySelector('input');
                if (!passwordInput) return;

                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    iconContainer.innerHTML = eyeOffIconSVG; // 「非表示」アイコンに切り替え
                } else {
                    passwordInput.type = 'password';
                    iconContainer.innerHTML = eyeIconSVG; // 「表示」アイコンに切り替え
                }
            });
        });

        // 「パスワードを変更する」ボタンのイベントリスナー（ダミー）
        if(elements.changePasswordBtn) {
            elements.changePasswordBtn.addEventListener('click', () => {
                alert('この機能は将来のアップデートで実装される予定です。');
            });
        }
        // --- ▲▲▲ ここまで変更 ▲▲▲ ---
    }

    // --- 5. アプリケーションの初期化 ---
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