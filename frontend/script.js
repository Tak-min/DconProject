document.addEventListener('DOMContentLoaded', () => {

    // --- DOM要素の取得 ---
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterBtn = document.getElementById('show-register-btn');
    const showLoginBtn = document.getElementById('show-login-btn');
    const loginErrorMessage = document.getElementById('login-error-message');
    const registerErrorMessage = document.getElementById('register-error-message');

    // --- 画面切り替えロジック ---
    const screens = document.querySelectorAll('.screen');
    function showScreen(screenId) {
        screens.forEach(screen => {
            // screen.id が screenId と一致すれば 'active' クラスを付与、そうでなければ削除
            screen.classList.toggle('active', screen.id === screenId);
        });
    }

    // --- イベントリスナーの設定 ---

    // 「新規登録」ボタンクリックで登録画面を表示
    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showScreen('register-screen');
        });
    }

    // 「ログイン画面に戻る」ボタンクリックでログイン画面を表示
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showScreen('login-screen');
        });
    }

    // --- ログインフォームの送信処理 ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // デフォルトのフォーム送信をキャンセル
            loginErrorMessage.textContent = ''; // エラーメッセージをクリア

            const formData = new FormData(loginForm);
            // FastAPIのOAuth2PasswordRequestFormは'username'をキーとするため、合わせる
            const urlSearchParams = new URLSearchParams();
            urlSearchParams.append('username', formData.get('employee_id'));
            urlSearchParams.append('password', formData.get('password'));

            try {
                const response = await fetch('/token', {
                    method: 'POST',
                    body: urlSearchParams,
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.detail || 'ログインに失敗しました。');
                }

                localStorage.setItem('accessToken', data.access_token);
                showScreen('recommendation-screen'); // おすすめ画面に遷移

            } catch (error) {
                loginErrorMessage.textContent = error.message;
            }
        });
    }

    // --- 新規登録フォームの送信処理 ---
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // デフォルトのフォーム送信をキャンセル
            registerErrorMessage.textContent = ''; // エラーメッセージをクリア

            const formData = new FormData(registerForm);
            const userData = Object.fromEntries(formData.entries());

            try {
                const response = await fetch('/register/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(userData),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.detail || '登録に失敗しました。');
                }

                alert('登録が完了しました。ログインしてください。');
                showScreen('login-screen'); // ログイン画面に遷移

            } catch (error) {
                registerErrorMessage.textContent = error.message;
            }
        });
    }
});