// DOMが完全に読み込まれてからスクリプトを実行する
document.addEventListener('DOMContentLoaded', () => {

    // --- グローバル変数とDOM要素の取得 ---
    const screens = document.querySelectorAll('.screen');
    let conversationData = []; // 会話データをグローバルに保持

    // 各画面の主要な要素を取得
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterBtn = document.getElementById('show-register-btn');
    const showLoginBtn = document.getElementById('show-login-btn');
    const loginErrorMessage = document.getElementById('login-error-message');
    const registerErrorMessage = document.getElementById('register-error-message');
    const logoutBtn = document.getElementById('logout-btn');
    
    // 各画面のコンテンツエリア
    const recommendationCard = document.querySelector('.recommendation-box');
    const localHistoryList = document.querySelector('.local-history-list');
    const chatLogArea = document.getElementById('chatLogArea');
    const conversationLogTitle = document.getElementById('conversationLogTitle');
    const deviceStatusCard = document.querySelector('.device-status-card');

    // --- 関数定義 ---

    /**
     * 認証トークンを付与し、認証エラーを自動処理するfetchのラッパー関数
     * @param {string} url - リクエスト先のURL
     * @param {object} options - fetchに渡すオプション
     * @returns {Promise<Response>} - fetchのレスポンス
     */
    async function authFetch(url, options = {}) {
        const token = localStorage.getItem('accessToken');

        // トークンがなければ、処理を中断してログイン画面へ
        if (!token) {
            showScreen('login-screen');
            throw new Error('Not authenticated');
        }

        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
        };

        const response = await fetch(url, { ...options, headers });

        // APIから認証エラー(401)が返ってきた場合、自動的にログアウト処理を行う
        if (response.status === 401) {
            localStorage.removeItem('accessToken');
            alert('セッションが切れました。再度ログインしてください。');
            showScreen('login-screen');
            throw new Error('Session expired');
        }

        return response;
    }

    /**
     * 指定されたIDの画面を表示し、対応するデータ読み込み関数を呼び出す
     * @param {string} screenId - 表示したい画面のID
     */
    function showScreen(screenId) {
        let screenFound = false;
        screens.forEach(screen => {
            const isActive = screen.id === screenId;
            screen.classList.toggle('active', isActive);
            if (isActive) screenFound = true;
        });

        if (!screenFound) {
            console.error(`Error: Screen with ID "${screenId}" not found.`);
            return;
        }

        // 画面表示時に対応するデータを読み込む
        switch (screenId) {
            case 'recommendation-screen':
                loadRecommendation();
                break;
            case 'history-list-screen':
                loadLocalHistory();
                break;
            case 'settings-screen':
                loadDeviceStatus();
                break;
        }
    }

    // おすすめ情報を取得して表示
    async function loadRecommendation() {
        if (!recommendationCard) return;
        try {
            const response = await authFetch('/recommendation');
            if (!response.ok) throw new Error('おすすめの取得に失敗しました。');
            const data = await response.json();
            
            recommendationCard.innerHTML = `
                <div class="conversation-summary-card">
                    <div class="card-header">
                        <span class="card-date">${data.date}</span>
                        <span class="card-id">${data.conversation_id}</span>
                    </div>
                    <p class="card-summary-text">${data.summary_text}</p>
                    <div class="card-tags">
                        ${data.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                </div>
            `;
        } catch (error) {
            if (error.message !== 'Session expired' && error.message !== 'Not authenticated') {
                recommendationCard.innerHTML = `<p class="error-message">${error.message}</p>`;
            }
        }
    }

    // ローカル会話履歴を取得して表示
    async function loadLocalHistory() {
        if (!localHistoryList) return;
        try {
            const response = await authFetch('/history');
            if (!response.ok) throw new Error('履歴の取得に失敗しました。');
            
            conversationData = await response.json();
            localHistoryList.innerHTML = ''; 

            if (conversationData.length === 0) {
                localHistoryList.innerHTML = '<p style="text-align: center; color: #777;">会話履歴はありません。</p>';
                return;
            }
            
            conversationData.forEach(conv => {
                const listItem = document.createElement('li');
                listItem.className = 'history-item';
                listItem.dataset.conversationId = conv.conversation_id;
                
                listItem.innerHTML = `
                    <div class="history-item-header">
                        <span class="history-item-id">ID: ${conv.conversation_id}</span>
                    </div>
                    <p class="history-item-preview">${conv.preview}</p>
                    <div class="history-item-footer">
                        <span class="history-item-datetime">開始: ${new Date(conv.start_time).toLocaleString('ja-JP')}</span>
                    </div>
                `;
                localHistoryList.appendChild(listItem);
            });
        } catch (error) {
            if (error.message !== 'Session expired' && error.message !== 'Not authenticated') {
                localHistoryList.innerHTML = `<p class="error-message">${error.message}</p>`;
            }
        }
    }

    // 会話ログ詳細を表示
    function displayConversationLogs(conversationId) {
        if (!chatLogArea || !conversationLogTitle) return;
        const conversation = conversationData.find(c => c.conversation_id === conversationId);
        if (!conversation) return;

        conversationLogTitle.textContent = `会話ログ: ${conversationId}`;
        chatLogArea.innerHTML = '';

        conversation.logs.forEach(log => {
            const logEntry = document.createElement('div');
            logEntry.className = 'chat-bubble-entry';
            logEntry.innerHTML = `
                <div class="chat-bubble-meta">
                    <span class="sender">${log.sender}</span> 
                    <span class="timestamp">${new Date(log.timestamp).toLocaleTimeString('ja-JP')}</span>
                </div>
                <div class="chat-bubble ${log.sender}">${log.message}</div>
            `;
            chatLogArea.appendChild(logEntry);
        });

        showScreen('conversation-log-screen');
    }

    // デバイスステータスを取得して表示
    async function loadDeviceStatus() {
        if (!deviceStatusCard) return;
        try {
            const response = await authFetch('/status');
            if (!response.ok) throw new Error('状態取得エラー');
            
            const data = await response.json();
            const statusText = deviceStatusCard.querySelector('.status-text');
            const statusDetail = deviceStatusCard.querySelector('.status-detail');
            const statusIndicator = statusText.querySelector('.status-indicator');

            statusIndicator.className = `status-indicator ${data.device_status}`;
            // statusTextのテキストノードを安全に更新
            statusText.childNodes[2].nodeValue = ` ${data.device_status.charAt(0).toUpperCase() + data.device_status.slice(1)}`;
            statusDetail.textContent = data.ai_ready ? 'AI準備OK' : 'AI準備中';

        } catch (error) {
            if (error.message !== 'Session expired' && error.message !== 'Not authenticated') {
                deviceStatusCard.querySelector('.status-text').textContent = '状態取得不可';
            }
        }
    }
    
    // --- イベントリスナーのセットアップ ---
    function setupEventListeners() {
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                loginErrorMessage.textContent = '';
                const formData = new FormData(loginForm);
                const urlSearchParams = new URLSearchParams();
                urlSearchParams.append('username', formData.get('employee_id'));
                urlSearchParams.append('password', formData.get('password'));
                try {
                    const response = await fetch('/token', { method: 'POST', body: urlSearchParams });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.detail || 'ログインに失敗しました。');
                    localStorage.setItem('accessToken', data.access_token);
                    showScreen('recommendation-screen');
                } catch (error) {
                    loginErrorMessage.textContent = error.message;
                }
            });
        }

        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                registerErrorMessage.textContent = '';
                const formData = new FormData(registerForm);
                const userData = Object.fromEntries(formData.entries());
                try {
                    const response = await fetch('/register/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(userData),
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.detail || '登録に失敗しました。');
                    alert('登録が完了しました。ログインしてください。');
                    showScreen('login-screen');
                } catch (error) {
                    registerErrorMessage.textContent = error.message;
                }
            });
        }
        
        if (showRegisterBtn) showRegisterBtn.addEventListener('click', (e) => { e.preventDefault(); showScreen('register-screen'); });
        if (showLoginBtn) showLoginBtn.addEventListener('click', (e) => { e.preventDefault(); showScreen('login-screen'); });

        if (localHistoryList) {
            localHistoryList.addEventListener('click', (e) => {
                const listItem = e.target.closest('.history-item');
                if (listItem && listItem.dataset.conversationId) {
                    displayConversationLogs(listItem.dataset.conversationId);
                }
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('accessToken');
                alert('ログアウトしました。');
                showScreen('login-screen');
            });
        }

        // サイドメニューなどのナビゲーションリンクにもイベントを設定
        const navLinks = document.querySelectorAll('[data-target-screen]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetScreen = link.dataset.targetScreen;
                if (targetScreen) {
                    // ログインが必要な画面への遷移は、トークンの有無を確認
                    const token = localStorage.getItem('accessToken');
                    if (!token && targetScreen !== 'login-screen' && targetScreen !== 'register-screen') {
                        showScreen('login-screen');
                    } else {
                        showScreen(targetScreen);
                    }
                }
            });
        });
    }

    // --- アプリケーションの初期化 ---
    function initializeApp() {
        setupEventListeners();
        
        const token = localStorage.getItem('accessToken');
        if (token) {
            showScreen('recommendation-screen');
        } else {
            showScreen('login-screen');
        }
    }

    // アプリケーションを実行
    initializeApp();
});