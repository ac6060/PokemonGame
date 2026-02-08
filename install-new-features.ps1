# 新功能自動安裝腳本
# 執行方式: .\install-new-features.ps1

Write-Host "=== 寶可夢對戰系統 - 新功能安裝腳本 ===" -ForegroundColor Cyan
Write-Host ""

$projectPath = "C:\Project\Antigravity\Test1"

# 1. 修改 index.html
Write-Host "[1/3] 修改 index.html..." -ForegroundColor Yellow

$htmlFile = Join-Path $projectPath "index.html"
$htmlContent = Get-Content $htmlFile -Raw

# 檢查是否已經安裝
if ($htmlContent -match "room-code-banner") {
    Write-Host "  ✓ HTML 已經包含新元素，跳過" -ForegroundColor Green
} else {
    # 在 </div> 前插入新元素 (battle-screen 結束前)
    $htmlInsert = @"
        
        <!-- Room Code Display -->
        <div id="room-code-banner" class="room-code-banner">
            <span>房間代碼：</span>
            <span id="battle-room-code" class="room-code-label">------</span>
        </div>
        
        <!-- Manual Reconnect Button -->
        <button id="manual-reconnect-btn" class="manual-reconnect-btn hidden">斷線重連</button>
"@
    
    # 找到 turn-indicator 後面的 </div>
    $htmlContent = $htmlContent -replace '(id="turn-indicator"[^>]*>.*?</div>)\s*(</div>)\s*(<!-- Victory)', "`$1$htmlInsert`r`n    `$2`r`n`r`n    `$3"
    
    Set-Content $htmlFile -Value $htmlContent -Encoding UTF8
    Write-Host "  ✓ HTML 修改完成" -ForegroundColor Green
}

# 2. 修改 style.css
Write-Host "[2/3] 修改 style.css..." -ForegroundColor Yellow

$cssFile = Join-Path $projectPath "style.css"
$cssContent = Get-Content $cssFile -Raw

if ($cssContent -match "room-code-banner") {
    Write-Host "  ✓ CSS 已經包含新樣式，跳過" -ForegroundColor Green
} else {
    $cssInsert = @"

/* Room Code Banner */
.room-code-banner {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 0.8rem 1.5rem;
    border-radius: 10px;
    border: 3px solid #FFD700;
    font-weight: 700;
    font-size: 1.1rem;
    z-index: 15;
    box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
}

.room-code-label {
    color: #FFD700;
    font-size: 1.3rem;
    margin-left: 0.5rem;
    letter-spacing: 2px;
}

/* Manual Reconnect Button */
.manual-reconnect-btn {
    position: absolute;
    bottom: 2rem;
    left: 2rem;
    padding: 0.8rem 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    z-index: 15;
    transition: all 0.3s ease;
    font-family: 'Noto Sans TC', sans-serif;
}

.manual-reconnect-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

/* Defeat class for result title */
.result-content h1.defeat {
    background: linear-gradient(45deg, #999, #666);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}
"@
    
    Set-Content $cssFile -Value ($cssContent + $cssInsert) -Encoding UTF8
    Write-Host "  ✓ CSS 修改完成" -ForegroundColor Green
}

# 3. 修改 script.js
Write-Host "[3/3] 修改 script.js..." -ForegroundColor Yellow

$jsFile = Join-Path $projectPath "script.js"
$jsContent = Get-Content $jsFile -Raw

if ($jsContent -match "battle-room-code") {
    Write-Host "  ✓ JavaScript 已經包含新功能，跳過" -ForegroundColor Green
} else {
    # 修改 1: 在 startBattle 函式中加入顯示房間代碼
    $jsContent = $jsContent -replace "(showScreen\('battle'\);)", "`$1`r`n    `r`n    // Display room code`r`n    document.getElementById('battle-room-code').textContent = gameState.roomCode;"
    
    # 修改 2: 更新 calculateEffectiveness 函式
    $oldCalculateEffectiveness = @'
function calculateEffectiveness\(moveType, defenderTypes\) \{[^}]+\}
'@
    
    $newCalculateEffectiveness = @"
function calculateEffectiveness(moveType, defenderTypes) {
    let multiplier = 1;
    const chart = typeChart[moveType];

    if (chart) {
        defenderTypes.forEach(type => {
            if (chart.strong?.includes(type)) multiplier *= 2;
            if (chart.weak?.includes(type)) multiplier *= 0.5;
        });
    }
    
    // Determine effectiveness message
    let effectivenessMsg = '';
    if (multiplier >= 2) {
        effectivenessMsg = '效果絕佳！';
    } else if (multiplier > 1) {
        effectivenessMsg = '有效果！';
    } else if (multiplier < 1 && multiplier > 0) {
        effectivenessMsg = '效果不好...';
    } else if (multiplier === 0) {
        effectivenessMsg = '沒有效果...';
    }

    return { multiplier, message: effectivenessMsg };
}
"@
    
    $jsContent = $jsContent -replace $oldCalculateEffectiveness, $newCalculateEffectiveness
    
    # 修改 3: 更新 executeMove 中的計算部分
    $jsContent = $jsContent -replace 'const effectiveness = calculateEffectiveness', 'const effectivenessResult = calculateEffectiveness'
    $jsContent = $jsContent -replace '\* effectiveness\)', '* effectivenessResult.multiplier)'
    
    # 在defender.currentHp 更新後加入效果訊息顯示
    $jsContent = $jsContent -replace "(defender\.currentHp = Math\.max\(0, defender\.currentHp - damage\);)", @"
`$1

        // Show effectiveness message if there is one
        if (effectivenessResult.message) {
            setTimeout(() => {
                showMessage(effectivenessResult.message);
            }, 1200);
        }
"@
    
    # 修改 4: 加入手動重連按鈕處理
    $reconnectHandler = @"

// Manual reconnect button handler
document.getElementById('manual-reconnect-btn').addEventListener('click', async () => {
    const code = prompt('請輸入房間代碼：');
    if (!code || code.length !== 6) {
        alert('請輸入正確的6位數房間代碼');
        return;
    }
    
    gameState.roomCode = code;
    gameState.roomRef = db.ref(`rooms/`${code}`);
    
    // Check if room exists
    const snapshot = await gameState.roomRef.once('value');
    if (!snapshot.exists()) {
        alert('房間不存在或已結Bundle');
        return;
    }
    
    const room = snapshot.val();
    
    // Try to determine player role from saved state or guess
    const saved = loadGameState();
    if (saved && saved.roomCode === code) {
        gameState.playerRole = saved.playerRole;
    } else {
        // Ask user which player they were
        const role = confirm('你是玩家1（房主）嗎？\n按確定選擇玩家1，取消選擇玩家2');
        gameState.playerRole = role ? 'player1' : 'player2';
    }
    
    // Save and attempt reconnect
    saveGameState();
    location.reload();
});

"@
    
    # 在最後一個 console.log 之前插入
    $jsContent = $jsContent -replace "(console\.log\('寶可夢對戰系統已啟動！'\);)", "$reconnectHandler`r`n`$1"
    
    Set-Content $jsFile -Value $jsContent -Encoding UTF8
    Write-Host "  ✓ JavaScript 修改完成" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== 安裝完成！ ===" -ForegroundColor Green
Write-Host ""
Write-Host "新功能:" -ForegroundColor Cyan
Write-Host "  ✓ 房間代碼顯示（戰鬥畫面右上角）" -ForegroundColor White
Write-Host "  ✓ 手動重連按鈕（戰鬥畫面左下角）" -ForegroundColor White
Write-Host "  ✓ 屬性效果訊息（效果絕佳/有效果/效果不好/沒有效果）" -ForegroundColor White
Write-Host ""
Write-Host "請重新整理瀏覽器以查看更改！" -ForegroundColor Yellow
