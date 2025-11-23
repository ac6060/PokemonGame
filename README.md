# 寶可夢對戰 | Pokémon Battle

一個使用 PokéAPI 和 Firebase 打造的線上雙人對戰寶可夢遊戲，靈感來自經典像素 Pokémon 遊戲。

![Pokémon Battle](https://img.shields.io/badge/Language-Traditional%20Chinese-blue)
![Firebase](https://img.shields.io/badge/Backend-Firebase-orange)
![PokéAPI](https://img.shields.io/badge/Data-Pok%C3%A9API-red)

## ✨ 特色功能

- **🌐 線上對戰**：使用 Firebase Realtime Database 實現即時雙人對戰
- **🎮 經典玩法**：回合制戰鬥系統，完整的屬性相剋機制
- **🇹🇼 繁體中文**：所有 UI、寶可夢名稱、招式皆為繁體中文
- **📡 即時數據**：從 PokéAPI 實時抓取寶可夢資料
- **🎨 復古美學**：像素風格 UI，經典對話框設計
- **✨ 動態特效**：
  - Gen 5 動態精靈圖（GIF）
  - 攻擊動畫（精靈移動）
  - 受傷動畫（搖晃、閃爍）
  - 屬性粒子特效（火焰、水花、葉片、閃電等）
  - HP 血條動態變色（綠→黃→紅）
  - 打字機動畫（對話逐字顯示）
- **🎭 多重場景**：森林、山谷、城市、洞穴、水域等背景，隨寶可夢屬性變化

## 🎯 遊戲規則

1. 每位玩家選擇 4 隻寶可夢組成隊伍
2. 雙方輪流選擇招式進行攻擊
3. 招式造成的傷害受屬性相剋影響
4. 當寶可夢 HP 歸零時失去戰鬥能力，自動換下一隻
5. 率先擊敗對方全部寶可夢者獲勝

## 🚀 快速開始

### 前置需求

- 現代瀏覽器（Chrome、Firefox、Edge 等）
- Firebase 帳號（免費）

### 設置步驟

1. **下載專案**
   ```bash
   # 將所有檔案下載到本地資料夾
   ```

2. **設置 Firebase**
   - 詳細步驟請參考 [FIREBASE_SETUP.md](FIREBASE_SETUP.md)
   - 簡要步驟：
     1. 前往 [Firebase Console](https://console.firebase.google.com/)
     2. 創建新專案
     3. 啟用 Realtime Database
     4. 複製配置代碼
     5. 更新 `firebase-config.js`

3. **啟動遊戲**
   - 直接在瀏覽器中打開 `index.html`
   - 或使用本地伺服器（推薦）

4. **開始對戰**
   - 玩家 1：點擊「建立房間」，分享房間代碼
   - 玩家 2：點擊「加入房間」，輸入代碼
   - 雙方選擇隊伍後即可開始對戰！

## 📁 專案結構

```
pokemon-battle/
│
├── index.html              # 主頁面
├── style.css              # 樣式表（復古設計、動畫）
├── script.js              # 遊戲邏輯（戰鬥系統、API 整合）
├── firebase-config.js     # Firebase 配置
├── FIREBASE_SETUP.md      # Firebase 設置指南
└── README.md              # 本文件
```

## 🎮 操作說明

### 房間創建
1. 點擊「建立房間」
2. 記下並分享 6 位數房間代碼
3. 等待對手加入

### 加入房間
1. 點擊「加入房間」
2. 輸入對手提供的房間代碼
3. 點擊「確認」

### 選擇隊伍
1. 從顯示的寶可夢中選擇 4 隻
2. 點擊「確認隊伍」
3. 等待對手選擇完成

### 戰鬥
1. 輪到你的回合時，選擇一個招式
2. 觀看攻擊動畫和特效
3. 等待對手回合
4. 重複直到分出勝負

## 🔧 技術棧

- **前端**：HTML5、CSS3、Vanilla JavaScript
- **後端**：Firebase Realtime Database
- **API**：[PokéAPI](https://pokeapi.co/)
- **字體**：Google Fonts (Noto Sans TC)
- **精靈圖**：Gen 5 動態 GIF

## 🎨 屬性系統

遊戲包含 18 種寶可夢屬性，完整的屬性相剋關係：

- 🔥 **火** → 草、冰、蟲、鋼
- 💧 **水** → 火、地面、岩石
- 🌿 **草** → 水、地面、岩石
- ⚡ **電** → 水、飛行
- 還有更多...

## 🌈 場景背景

背景會根據當前寶可夢的屬性自動切換：

- 🌲 森林（草、蟲、毒）
- 🏔️ 山谷（岩石、地面、冰）
- 🏙️ 城市（格鬥、鋼）
- 🕳️ 洞穴（幽靈、惡）
- 🌊 水域（水）
- 🌾 平原（一般、飛行、妖精、超能力）
- 🌋 火山（火）
- ⚡ 電網（電）

## 📱 響應式設計

遊戲支援桌面和平板設備，自動調整佈局。

## ⚠️ 注意事項

- 首次載入時，PokéAPI 需要抓取寶可夢資料，可能需要等待
- 建議使用穩定的網路連線以確保即時同步
- Firebase 免費方案有使用限制，請注意配額

## 🐛 已知問題

- 部分寶可夢可能沒有 Gen 5 動態 GIF，會自動使用靜態圖片
- 極少數寶可夢可能缺少繁體中文翻譯

## 📄 授權

本專案僅供學習和娛樂使用。

寶可夢及相關圖像版權歸 Nintendo、Game Freak 和 The Pokémon Company 所有。

## 🙏 致謝

- [PokéAPI](https://pokeapi.co/) - 提供豐富的寶可夢資料
- [Firebase](https://firebase.google.com/) - 提供即時資料庫服務
- [Google Fonts](https://fonts.google.com/) - 提供繁體中文字體

---

**享受對戰樂趣！** 🎮✨
