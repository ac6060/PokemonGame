# 寶可夢對戰 - Firebase 設置指南

## 📋 必要步驟

為了讓線上對戰功能正常運作，您需要設置一個 Firebase 專案。別擔心，這是完全免費的！

## 🚀 設置步驟

### 1. 創建 Firebase 專案

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 點擊「新增專案」或「Add project」
3. 輸入專案名稱（例如：pokemon-battle）
4. 不需要啟用 Google Analytics（可選）
5. 點擊「建立專案」

### 2. 註冊 Web 應用程式

1. 在專案首頁，點擊 Web 圖示（</>）
2. 輸入應用程式暱稱（例如：Pokemon Battle App）
3. **不需要**勾選「Firebase Hosting」
4. 點擊「註冊應用程式」

### 3. 複製配置代碼

您會看到類似這樣的配置代碼：

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "pokemon-battle-xxxxx.firebaseapp.com",
  databaseURL: "https://pokemon-battle-xxxxx-default-rtdb.firebaseio.com",
  projectId: "pokemon-battle-xxxxx",
  storageBucket: "pokemon-battle-xxxxx.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:xxxxxxxxxxxxxxxxxx"
};
```

**重要：** 複製這段代碼！

### 4. 啟用 Realtime Database

1. 在左側選單找到「建構」→「Realtime Database」
2. 點擊「建立資料庫」
3. 選擇資料庫位置（建議選擇「asia-southeast1」）
4. 選擇「以測試模式啟動」（用於開發）
   - **注意：** 測試模式下，任何人都可以讀寫資料庫
   - 生產環境請設置適當的安全規則
5. 點擊「啟用」

### 5. 更新應用程式配置

1. 打開專案中的 `firebase-config.js` 文件
2. 將您在步驟 3 複製的配置代碼，替換文件中的佔位符
3. 保存文件

**替換前：**
```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    // ...
};
```

**替換後：**
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    authDomain: "pokemon-battle-xxxxx.firebaseapp.com",
    // ... (您的實際配置)
};
```

### 6. 測試應用程式

1. 在瀏覽器中打開 `index.html`
2. 打開瀏覽器開發者工具（F12）
3. 查看 Console，應該會看到「Firebase initialized successfully!」
4. 如果看到錯誤訊息，請檢查配置是否正確

## 🎮 如何使用

### 開始對戰

1. **玩家 1（主機）：**
   - 點擊「建立房間」
   - 記下 6 位數房間代碼
   - 分享給對手

2. **玩家 2（訪客）：**
   - 點擊「加入房間」
   - 輸入房間代碼
   - 點擊「確認」

3. **雙方玩家：**
   - 從列表中選擇 4 隻寶可夢
   - 點擊「確認隊伍」
   - 等待對手選擇完成

4. **對戰開始！**
   - 輪流選擇招式攻擊
   - 戰鬥至一方所有寶可夢失去戰鬥能力

## 🔧 資料庫安全規則（生產環境建議）

如果您要部署到生產環境，請在 Firebase Console 的 Realtime Database → 規則中設置：

```json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        ".read": true,
        ".write": true,
        ".validate": "newData.hasChildren(['host', 'player1'])"
      }
    }
  }
}
```

## ❓ 常見問題

**Q: 為什麼我看到「Firebase 配置錯誤」？**
A: 請確保您已正確複製並貼上 Firebase 配置，特別是 `databaseURL` 欄位。

**Q: 房間代碼不存在？**
A: 確保房間代碼正確（6位數），且主機玩家已經創建房間。

**Q: 對手加入後沒有反應？**
A: 檢查網路連線，並確保 Realtime Database 已啟用且規則允許讀寫。

**Q: 寶可夢圖片載入很慢？**
A: PokéAPI 的圖片需要從外部伺服器載入，首次載入可能較慢。請耐心等待。

## 🎉 完成！

設置完成後，您就可以和朋友一起享受線上寶可夢對戰了！

---

**技術支援：** 如有問題，請檢查瀏覽器 Console 中的錯誤訊息。
