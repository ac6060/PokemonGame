# New Features Implementation Guide

## Overview
This guide contains all the code changes needed to implement:
1. Manual reconnection with room code input
2. Always display room code during battle  
3. Type effectiveness messages (效果絕佳/有效果/效果不好/沒有效果)

---

## 1. HTML Changes (index.html)

### Add room code display to battle screen
Add these elements before the closing `</div>` of `battle-screen` (around line 161):

```html
        <!-- Room Code Display -->
        <div id="room-code-banner" class="room-code-banner">
            <span>房間代碼：</span>
            <span id="battle-room-code" class="room-code-label">------</span>
        </div>
        
        <!--Manual Reconnect Button -->
        <button id="manual-reconnect-btn" class="manual-reconnect-btn hidden">斷線重連</button>
    </div>
```

---

## 2. CSS Changes (style.css)

### Add styles for room code banner and reconnect button
Add to the end of the file before the closing `}`:

```css
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
```

---

## 3. JavaScript Changes (script.js)

### A. Update startBattle() to display room code
After line where `showScreen('battle')` is called, add:

```javascript
// Display room code
document.getElementById('battle-room-code').textContent = gameState.roomCode;
```

### B. Update calculateEffectiveness() to return message
Replace the current `calculateEffectiveness` function (around line 717) with:

```javascript
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
```

### C. Update executeMove() to show effectiveness message
Find the line in `executeMove` that calls `calculateEffectiveness` (around line 665) and update:

```javascript
// OLD:
const effectiveness = calculateEffectiveness(move.type, defender.types);
const damage = Math.floor((move.power * (attacker.stats.attack / defender.stats.defense) * effectiveness) / 5);

// NEW:
const effectivenessResult = calculateEffectiveness(move.type, defender.types);
const damage = Math.floor((move.power * (attacker.stats.attack / defender.stats.defense) * effectivenessResult.multiplier) / 5);

defender.currentHp = Math.max(0, defender.currentHp - damage);

// Show effectiveness message if there is one
if (effectivenessResult.message) {
    setTimeout(() => {
        showMessage(effectivenessResult.message);
    }, 1200);
}
```

### D. Add manual reconnect button handler
Add at the end of the file before the auto-reconnect code:

```javascript
// Manual reconnect button handler
document.getElementById('manual-reconnect-btn').addEventListener('click', async () => {
    const code = prompt('請輸入房間代碼：');
    if (!code || code.length !== 6) {
        alert('請輸入正確的6位數房間代碼');
        return;
    }
    
    gameState.roomCode = code;
    gameState.roomRef = db.ref(`rooms/${code}`);
    
    // Check if room exists
    const snapshot = await gameState.roomRef.once('value');
    if (!snapshot.exists()) {
        alert('房間不存在或已結束');
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
```

---

## Summary of Changes

**HTML (index.html)**:
- Add room code banner element
- Add manual reconnect button

**CSS (style.css)**:
- Style for room code banner (top-right corner)
- Style for manual reconnect button (bottom-left corner)  
- Defeat class for gray gradient on loss

**JavaScript (script.js)**:
- Display room code in battle screen
- Enhanced calculateEffectiveness() returns both multiplier and message
- executeMove() shows effectiveness message after attack
- Manual reconnect button allows entering room code to rejoin

---

## Testing
1. Start a battle and verify room code appears top-right
2. Use different type attacks and check for effectiveness messages
3. Test manual reconnect by refreshing and clicking the reconnect button

All changes maintain the existing Traditional Chinese localization and retro pixel art aesthetic!
