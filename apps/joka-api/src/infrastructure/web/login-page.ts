export const loginPageHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JOKA - 로그인</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 40px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    h1 { text-align: center; margin-bottom: 8px; color: #333; }
    .subtitle { text-align: center; color: #888; margin-bottom: 32px; font-size: 14px; }
    .kakao-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 14px;
      background: #FEE500;
      color: #191919;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
    }
    .kakao-btn:hover { background: #F0D800; }
    .user-info {
      background: #f9f9f9;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .user-info h3 { margin-bottom: 12px; color: #333; }
    .user-info p { margin-bottom: 6px; color: #555; font-size: 14px; }
    .user-info p span { font-weight: 600; color: #333; }
    .albums-section { margin-top: 20px; }
    .albums-section h3 { margin-bottom: 12px; color: #333; }
    .album-item {
      background: #f0f0f0;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 6px;
      font-size: 14px;
      color: #444;
    }
    .no-albums { color: #999; font-size: 14px; font-style: italic; }
    .logout-btn {
      display: block;
      width: 100%;
      padding: 12px;
      background: #ff4444;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 16px;
    }
    .logout-btn:hover { background: #cc0000; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>JOKA</h1>
    <p class="subtitle">가족 사진 앨범 서비스</p>

    <div id="login-section">
      <a href="/api/v1/auth/kakao" class="kakao-btn">카카오로 로그인</a>
    </div>

    <div id="user-section" class="hidden">
      <div class="user-info">
        <h3>내 정보</h3>
        <p>이름: <span id="user-name"></span></p>
        <p>이메일: <span id="user-email"></span></p>
      </div>

      <div class="albums-section">
        <h3>내 앨범</h3>
        <div id="albums-list"></div>
      </div>

      <button class="logout-btn" onclick="logout()">로그아웃</button>
    </div>
  </div>

  <script>
    function getCookie(name) {
      const value = '; ' + document.cookie;
      const parts = value.split('; ' + name + '=');
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    }

    async function tryRefresh() {
      const refreshRes = await fetch('/api/v1/auth/refresh', { method: 'POST' });
      if (!refreshRes.ok) return null;
      const { accessToken } = await refreshRes.json();
      document.cookie = 'accessToken=' + accessToken + '; path=/; max-age=900; SameSite=Strict';
      return accessToken;
    }

    async function checkAuth() {
      // 로그인 상태의 source of truth는 httpOnly refreshToken이므로,
      // JS가 볼 수 있는 accessToken이 없더라도 곧장 로그인 화면으로 보내지 않고 refresh를 먼저 시도한다.
      let accessToken = getCookie('accessToken') || (await tryRefresh());
      if (!accessToken) {
        showLogin();
        return;
      }

      try {
        let meRes = await fetch('/api/v1/me', {
          headers: { 'Authorization': 'Bearer ' + accessToken }
        });

        if (!meRes.ok) {
          accessToken = await tryRefresh();
          if (!accessToken) {
            showLogin();
            return;
          }
          meRes = await fetch('/api/v1/me', {
            headers: { 'Authorization': 'Bearer ' + accessToken }
          });
          if (!meRes.ok) {
            showLogin();
            return;
          }
        }

        const me = await meRes.json();
        document.getElementById('user-name').textContent = me.name;
        document.getElementById('user-email').textContent = me.email;

        // 앨범 목록 조회
        const albumsRes = await fetch('/api/v1/albums', {
          headers: { 'Authorization': 'Bearer ' + accessToken }
        });

        const albumsList = document.getElementById('albums-list');
        if (albumsRes.ok) {
          const data = await albumsRes.json();
          if (data.items.length === 0) {
            albumsList.innerHTML = '<p class="no-albums">속한 앨범이 없습니다.</p>';
          } else {
            albumsList.innerHTML = data.items
              .map(function(a) { return '<div class="album-item">' + escapeHtml(a.name) + '</div>'; })
              .join('');
          }
        } else {
          albumsList.innerHTML = '<p class="no-albums">앨범 목록을 불러올 수 없습니다.</p>';
        }

        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('user-section').classList.remove('hidden');
      } catch (e) {
        showLogin();
      }
    }

    function escapeHtml(text) {
      var div = document.createElement('div');
      div.appendChild(document.createTextNode(text));
      return div.innerHTML;
    }

    function showLogin() {
      document.getElementById('login-section').classList.remove('hidden');
      document.getElementById('user-section').classList.add('hidden');
    }

    async function logout() {
      const accessToken = getCookie('accessToken');
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: accessToken ? { 'Authorization': 'Bearer ' + accessToken } : {}
      });
      document.cookie = 'accessToken=; path=/; max-age=0';
      showLogin();
    }

    checkAuth();
  </script>
</body>
</html>`;
