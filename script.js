// ===== GLOBAL STATE =====
const CONFIG = {
    TURN_TIME_LIMIT: 30, // 每回合秒數（可調整）
    DISCONNECT_TIMEOUT: 60, // 斷線等待秒數
};

const gameState = {
    roomCode: null,
    isHost: false,
    playerRole: null, // 'player1' or 'player2'
    currentScreen: 'room',
    playerTeam: [],
    enemyTeam: [],
    playerActive: null,
    enemyActive: null,
    currentTurn: null,
    battleLog: [],
    roomRef: null,
    timerInterval: null,
    timeRemaining: CONFIG.TURN_TIME_LIMIT,
    battleStarted: false
};

// Chinese Type Names
const typeNamesChinese = {
    normal: '一般', fire: '火', water: '水', electric: '電', grass: '草',
    ice: '冰', fighting: '格鬥', poison: '毒', ground: '地面', flying: '飛行',
    psychic: '超能力', bug: '蟲', rock: '岩石', ghost: '幽靈', dragon: '龍',
    dark: '惡', steel: '鋼', fairy: '妖精'
};

// Type Effectiveness (simplified)
const typeChart = {
    fire: { strong: ['grass', 'ice', 'bug', 'steel'], weak: ['water', 'rock', 'ground'] },
    water: { strong: ['fire', 'ground', 'rock'], weak: ['electric', 'grass'] },
    grass: { strong: ['water', 'ground', 'rock'], weak: ['fire', 'ice', 'poison', 'flying', 'bug'] },
    electric: { strong: ['water', 'flying'], weak: ['ground'] },
    ice: { strong: ['grass', 'ground', 'flying', 'dragon'], weak: ['fire', 'fighting', 'rock', 'steel'] },
    fighting: { strong: ['normal', 'ice', 'rock', 'dark', 'steel'], weak: ['flying', 'psychic', 'fairy'] },
    poison: { strong: ['grass', 'fairy'], weak: ['ground', 'psychic'] },
    ground: { strong: ['fire', 'electric', 'poison', 'rock', 'steel'], weak: ['water', 'grass', 'ice'] },
    flying: { strong: ['grass', 'fighting', 'bug'], weak: ['electric', 'ice', 'rock'] },
    psychic: { strong: ['fighting', 'poison'], weak: ['bug', 'ghost', 'dark'] },
    bug: { strong: ['grass', 'psychic', 'dark'], weak: ['fire', 'flying', 'rock'] },
    rock: { strong: ['fire', 'ice', 'flying', 'bug'], weak: ['water', 'grass', 'fighting', 'ground', 'steel'] },
    ghost: { strong: ['psychic', 'ghost'], weak: ['ghost', 'dark'] },
    dragon: { strong: ['dragon'], weak: ['ice', 'dragon', 'fairy'] },
    dark: { strong: ['psychic', 'ghost'], weak: ['fighting', 'bug', 'fairy'] },
    steel: { strong: ['ice', 'rock', 'fairy'], weak: ['fire', 'fighting', 'ground'] },
    fairy: { strong: ['fighting', 'dragon', 'dark'], weak: ['poison', 'steel'] }
};

// Background mapping
const backgroundMap = {
    grass: 'forest', fire: 'volcano', water: 'water', electric: 'electric',
    rock: 'mountain', ground: 'mountain', fighting: 'city', psychic: 'plains',
    ghost: 'cave', dark: 'cave', normal: 'plains', bug: 'forest',
    poison: 'forest', ice: 'mountain', dragon: 'mountain', steel: 'city',
    fairy: 'plains', flying: 'plains'
};

// ===== UTILITY FUNCTIONS =====
function generateRoomCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    setTimeout(() => {
        document.getElementById(`${screenName}-screen`).classList.add('active');
        gameState.currentScreen = screenName;
    }, 100);
}

function showMessage(text, duration = 3000) {
    const messageEl = document.getElementById('battle-message');
    messageEl.textContent = '';

    // Typewriter effect
    let i = 0;
    const typewriter = setInterval(() => {
        if (i < text.length) {
            messageEl.textContent += text.charAt(i);
            i++;
        } else {
            clearInterval(typewriter);
        }
    }, 30);
}

async function fetchPokemonData(id) {
    try {
        // Fetch base Pokemon data
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
        const data = await response.json();

        // Fetch species data for Chinese name
        const speciesResponse = await fetch(data.species.url);
        const speciesData = await speciesResponse.json();

        // Get Traditional Chinese name
        const chineseName = speciesData.names.find(n => n.language.name === 'zh-Hant');

        // Get Gen 5 animated sprite
        const animatedSprite = data.sprites.versions?.['generation-v']?.['black-white']?.animated?.front_default
            || data.sprites.front_default;

        // Fetch move details
        const moves = await Promise.all(
            data.moves.slice(0, 4).map(async (moveData) => {
                const moveResponse = await fetch(moveData.move.url);
                const moveDetail = await moveResponse.json();
                const chineseMoveName = moveDetail.names.find(n => n.language.name === 'zh-Hant');
                return {
                    name: chineseMoveName?.name || moveDetail.name,
                    type: moveDetail.type.name,
                    power: moveDetail.power || 40
                };
            })
        );

        return {
            id: data.id,
            name: chineseName?.name || data.name,
            sprite: animatedSprite,
            types: data.types.map(t => t.type.name),
            stats: {
                hp: data.stats[0].base_stat,
                attack: data.stats[1].base_stat,
                defense: data.stats[2].base_stat
            },
            moves: moves,
            currentHp: data.stats[0].base_stat
        };
    } catch (error) {
        console.error('Error fetching Pokemon:', error);
        return null;
    }
}

function monitorOpponentDisconnect(opponentRole) {
    let disconnectTimeout = null;
    let countdownInterval = null;

    gameState.roomRef.child(`${opponentRole}/online`).on('value', (snapshot) => {
        const isOnline = snapshot.val();

        // 只在戰鬥真正開始後才檢查離線
        if (gameState.battleStarted && gameState.currentScreen === 'battle') {
            if (isOnline === false) {
                // 對手離線，開始60秒倒數
                if (!disconnectTimeout) {
                    showMessage('對手斷線中...等待重連（60秒）');

                    let remainingSeconds = CONFIG.DISCONNECT_TIMEOUT;
                    countdownInterval = setInterval(() => {
                        remainingSeconds--;
                        if (remainingSeconds > 0) {
                            showMessage(`對手斷線中...等待重連（${remainingSeconds}秒）`);
                        }
                    }, 1000);

                    disconnectTimeout = setTimeout(async () => {
                        clearInterval(countdownInterval);
                        stopTimer();

                        const overlay = document.getElementById('result-overlay');
                        const title = document.getElementById('result-title');
                        const message = document.getElementById('result-message');

                        title.textContent = '對手離線';
                        title.style.background = 'linear-gradient(45deg, #999, #666)';
                        message.textContent = '對手已離線，對戰結束';
                        overlay.classList.remove('hidden');

                        // 清理 Firebase 房間數據
                        await gameState.roomRef.remove();

                        // 清理遊戲狀態
                        clearGameState();
                    }, CONFIG.DISCONNECT_TIMEOUT * 1000);
                }
            } else if (isOnline === true) {
                // 對手重新上線
                if (disconnectTimeout) {
                    clearTimeout(disconnectTimeout);
                    if (countdownInterval) {
                        clearInterval(countdownInterval);
                    }
                    disconnectTimeout = null;
                    countdownInterval = null;
                    showMessage('對手已重新連線！');
                }
            }
        }
    });
}

// ===== STATE PERSISTENCE =====
function saveGameState() {
    const state = {
        roomCode: gameState.roomCode,
        playerRole: gameState.playerRole,
        battleStarted: gameState.battleStarted,
        timestamp: Date.now()
    };
    localStorage.setItem('pokemonBattleState', JSON.stringify(state));
}

function loadGameState() {
    const saved = localStorage.getItem('pokemonBattleState');
    if (!saved) return null;

    try {
        const state = JSON.parse(saved);
        // 檢查是否在30分鐘內
        if (Date.now() - state.timestamp < 30 * 60 * 1000) {
            return state;
        }
    } catch (e) {
        console.error('Failed to load game state:', e);
    }

    clearGameState();
    return null;
}

function clearGameState() {
    localStorage.removeItem('pokemonBattleState');
}

async function attemptReconnect() {
    const saved = loadGameState();
    if (!saved) return false;

    console.log('嘗試重新連線...', saved);

    gameState.roomCode = saved.roomCode;
    gameState.playerRole = saved.playerRole;
    gameState.roomRef = db.ref(`rooms/${saved.roomCode}`);

    // 檢查房間是否還存在
    const snapshot = await gameState.roomRef.once('value');
    if (!snapshot.exists()) {
        console.log('房間不存在，清理狀態');
        clearGameState();
        return false;
    }

    const room = snapshot.val();

    // 立即恢復線上狀態 (在做任何其他事情之前)
    const connectedRef = db.ref('.info/connected');
    const myConnectionRef = gameState.roomRef.child(`${gameState.playerRole}/online`);

    // 先設置為在線，告訴對手我回來了
    await myConnectionRef.set(true);
    myConnectionRef.onDisconnect().set(false);

    connectedRef.on('value', (snapshot) => {
        if (snapshot.val() === true) {
            myConnectionRef.set(true);
            myConnectionRef.onDisconnect().set(false);
        }
    });

    // 檢查遊戲狀態 - 只有保存時是戰鬥中才恢復戰鬥
    if (room.player1?.team && room.player2?.team && saved.battleStarted) {
        // 遊戲已經在進行中，恢復戰鬥
        gameState.battleStarted = true;

        // 載入隊伍
        gameState.playerTeam = room[gameState.playerRole].team;
        const enemyRole = gameState.playerRole === 'player1' ? 'player2' : 'player1';
        gameState.enemyTeam = room[enemyRole].team;

        // 恢復活躍寶可夢索引
        gameState.playerActive = room[gameState.playerRole].activePokemon || 0;
        gameState.enemyActive = room[enemyRole].activePokemon || 0;

        console.log('恢復戰鬥狀態');

        // 檢查對手是否還在線上
        const opponentOnline = room[enemyRole]?.online;

        if (opponentOnline === false) {
            // 對手已離線，清理房間並結束遊戲
            console.log('對手已離線，清理房間');
            await gameState.roomRef.remove(); // 清理 Firebase 房間數據
            clearGameState();

            showScreen('room');
            alert('對手已離線，遊戲已結束');
            return false;
        }

        startBattle();
        return true;
    } else if (room.player1?.ready || room.player2?.ready) {
        // 還在隊伍選擇階段
        console.log('恢復隊伍選擇階段');

        // 清空隊伍，讓玩家重新選擇
        gameState.playerTeam = [];
        gameState.battleStarted = false;

        // 重置準備狀態
        await gameState.roomRef.child(`${gameState.playerRole}/ready`).set(false);
        await gameState.roomRef.child(`${gameState.playerRole}/team`).set(null);

        showScreen('team');
        loadTeamSelection();
        return true;
    }

    // 如果不符合重連條件，清理狀態
    clearGameState();
    return false;
}

// ===== ROOM MANAGEMENT =====
document.getElementById('create-room-btn').addEventListener('click', async () => {
    gameState.roomCode = generateRoomCode();
    gameState.isHost = true;
    gameState.playerRole = 'player1';

    // Create room in Firebase
    gameState.roomRef = db.ref(`rooms/${gameState.roomCode}`);
    await gameState.roomRef.set({
        host: 'player1',
        player1: { ready: false, team: null, activePokemon: 0 },
        player2: null,
        gameStarted: false,
        currentTurn: 'player1'
    });

    document.getElementById('room-code-text').textContent = gameState.roomCode;
    document.querySelector('.room-code').classList.remove('hidden');
    document.querySelector('.room-options').style.display = 'none';
    document.getElementById('connection-status').textContent = '房間已創建！';

    // 保存遊戲狀態供重連使用
    saveGameState();

    // Setup presence system
    const connectedRef = db.ref('.info/connected');
    const myConnectionRef = gameState.roomRef.child('player1/online');

    connectedRef.on('value', (snapshot) => {
        if (snapshot.val() === true) {
            myConnectionRef.set(true);
            myConnectionRef.onDisconnect().set(false);
        }
    });

    // Listen for player 2 joining (only once)
    let hasPlayer2Joined = false;
    gameState.roomRef.child('player2').on('value', (snapshot) => {
        if (snapshot.val() && !hasPlayer2Joined) {
            hasPlayer2Joined = true;
            document.getElementById('connection-status').textContent = '對手已加入！正在載入隊伍選擇...';
            setTimeout(() => {
                loadTeamSelection();
                showScreen('team');
            }, 1500);
        }
    });
});

document.getElementById('join-room-btn').addEventListener('click', () => {
    document.querySelector('.room-join').classList.remove('hidden');
    document.querySelector('.room-options').style.display = 'none';
});

document.getElementById('join-submit-btn').addEventListener('click', async () => {
    const code = document.getElementById('room-code-input').value.toUpperCase();

    if (code.length !== 6) {
        document.getElementById('connection-status').textContent = '請輸入6位數房間代碼';
        return;
    }

    gameState.roomCode = code;
    gameState.isHost = false;
    gameState.playerRole = 'player2';
    gameState.roomRef = db.ref(`rooms/${code}`);

    // Check if room exists
    const snapshot = await gameState.roomRef.once('value');
    if (!snapshot.exists()) {
        document.getElementById('connection-status').textContent = '房間不存在！';
        return;
    }

    // Join room
    await gameState.roomRef.child('player2').set({ ready: false, team: null, activePokemon: 0 });
    document.getElementById('connection-status').textContent = '成功加入房間！載入中...';

    // 保存遊戲狀態供重連使用
    saveGameState();

    // Setup presence system
    const connectedRef = db.ref('.info/connected');
    const myConnectionRef = gameState.roomRef.child('player2/online');

    connectedRef.on('value', (snapshot) => {
        if (snapshot.val() === true) {
            myConnectionRef.set(true);
            myConnectionRef.onDisconnect().set(false);
        }
    });

    setTimeout(() => {
        loadTeamSelection();
        showScreen('team');
    }, 1000);
});

// ===== TEAM SELECTION =====
async function loadTeamSelection() {
    const grid = document.getElementById('pokemon-grid');
    grid.innerHTML = '<p style="text-align: center; width: 100%;">載入寶可夢中...</p>';

    // Load 30 random Pokemon
    const pokemonIds = [];
    while (pokemonIds.length < 30) {
        const id = Math.floor(Math.random() * 151) + 1; // Gen 1
        if (!pokemonIds.includes(id)) pokemonIds.push(id);
    }

    grid.innerHTML = '';

    for (const id of pokemonIds) {
        const pokemon = await fetchPokemonData(id);
        if (pokemon) {
            const card = document.createElement('div');
            card.className = 'pokemon-card';
            card.innerHTML = `
                <img src="${pokemon.sprite}" alt="${pokemon.name}">
                <div class="card-name">${pokemon.name}</div>
            `;
            card.addEventListener('click', () => selectPokemon(pokemon, card));
            grid.appendChild(card);
        }
    }
}

function selectPokemon(pokemon, cardEl) {
    if (gameState.playerTeam.find(p => p.id === pokemon.id)) {
        // Deselect
        gameState.playerTeam = gameState.playerTeam.filter(p => p.id !== pokemon.id);
        cardEl.classList.remove('selected');
    } else if (gameState.playerTeam.length < 4) {
        // Select
        gameState.playerTeam.push(pokemon);
        cardEl.classList.add('selected');
    } else {
        return;
    }

    document.getElementById('selected-count').textContent = gameState.playerTeam.length;

    const confirmBtn = document.getElementById('confirm-team-btn');
    if (gameState.playerTeam.length === 4) {
        confirmBtn.classList.remove('disabled');
        confirmBtn.disabled = false;
    } else {
        confirmBtn.classList.add('disabled');
        confirmBtn.disabled = true;
    }
}

document.getElementById('confirm-team-btn').addEventListener('click', async () => {
    document.getElementById('team-status').textContent = '隊伍已確認！等待對手...';
    document.getElementById('confirm-team-btn').disabled = true;

    // Upload team to Firebase
    await gameState.roomRef.child(`${gameState.playerRole}/team`).set(
        gameState.playerTeam.map(p => ({
            id: p.id,
            name: p.name,
            sprite: p.sprite,
            types: p.types,
            stats: p.stats,
            moves: p.moves,
            currentHp: p.stats.hp,
            maxHp: p.stats.hp
        }))
    );
    await gameState.roomRef.child(`${gameState.playerRole}/ready`).set(true);

    // Wait for both players to be ready
    const checkBothReady = async () => {
        const snapshot = await gameState.roomRef.once('value');
        const room = snapshot.val();

        if (room.player1?.ready && room.player2?.ready && !gameState.battleStarted) {
            // 設置標誌避免重複觸發
            gameState.battleStarted = true;

            // Load enemy team
            const enemyRole = gameState.playerRole === 'player1' ? 'player2' : 'player1';
            gameState.enemyTeam = room[enemyRole].team;

            // Start battle
            setTimeout(() => {
                startBattle();
            }, 1000);
        } else if (!room.player1?.ready || !room.player2?.ready) {
            // 如果還沒準備好，1秒後再檢查
            setTimeout(checkBothReady, 1000);
        }
    };

    checkBothReady();
});

// ===== BATTLE SYSTEM =====
function startBattle() {
    showScreen('battle');

    gameState.playerActive = 0;
    gameState.enemyActive = 0;

    // 保存戰鬥開始狀態
    gameState.battleStarted = true;
    saveGameState();

    // 更新 Firebase gameStarted 標誌
    gameState.roomRef.update({ gameStarted: true });

    // 初始化 activePokemon
    gameState.roomRef.child(`${gameState.playerRole}/activePokemon`).set(0);

    // Set background based on types
    const playerType = gameState.playerTeam[0].types[0];
    const bgClass = backgroundMap[playerType] || 'plains';
    document.getElementById('battle-background').className = `battle-background ${bgClass}`;

    // Display Pokemon
    displayPokemon('player', gameState.playerTeam[0]);
    displayPokemon('enemy', gameState.enemyTeam[0]);

    showMessage('對戰開始！');

    // 開始監控對手離線
    const opponentRole = gameState.playerRole === 'player1' ? 'player2' : 'player1';
    monitorOpponentDisconnect(opponentRole);

    // Listen for turn changes
    gameState.roomRef.child('currentTurn').on('value', (snapshot) => {
        gameState.currentTurn = snapshot.val();

        if (gameState.currentTurn === gameState.playerRole) {
            // 我的回合
            stopTimer();
            hideTimerDisplay();
            setTimeout(() => {
                showMoveMenu();
                startTimer();
            }, 2000);
        } else {
            // 對手回合
            hideTimerDisplay();
            showWaitingMessage();
        }
    });

    // Listen for moves
    gameState.roomRef.child(`${opponentRole}/currentMove`).on('value', (snapshot) => {
        const move = snapshot.val();
        if (move && gameState.currentTurn !== gameState.playerRole) {
            executeMove(move, false);
        }
    });

    // Listen for opponent's HP changes
    gameState.roomRef.child(`${opponentRole}/team`).on('value', (snapshot) => {
        const opponentTeam = snapshot.val();
        if (opponentTeam && gameState.enemyTeam.length > 0) {
            // Update enemy team HP
            opponentTeam.forEach((pokemon, index) => {
                if (gameState.enemyTeam[index]) {
                    gameState.enemyTeam[index].currentHp = pokemon.currentHp;
                }
            });
            // Refresh display
            if (gameState.enemyActive !== null) {
                displayPokemon('enemy', gameState.enemyTeam[gameState.enemyActive]);
            }
        }
    });

    // Listen for opponent's active Pokemon changes
    gameState.roomRef.child(`${opponentRole}/activePokemon`).on('value', (snapshot) => {
        const activeIndex = snapshot.val();
        if (activeIndex !== null && activeIndex !== gameState.enemyActive) {
            gameState.enemyActive = activeIndex;
            if (gameState.enemyTeam[activeIndex]) {
                displayPokemon('enemy', gameState.enemyTeam[activeIndex]);
                showMessage(`對手上場：${gameState.enemyTeam[activeIndex].name}！`);
            }
        }
    });
}

function displayPokemon(side, pokemon) {
    const spriteEl = document.getElementById(`${side}-sprite`);
    const nameEl = document.getElementById(`${side}-name`);
    const hpFillEl = document.getElementById(`${side}-hp-fill`);
    const hpTextEl = document.getElementById(`${side}-hp-text`);
    const typesEl = document.getElementById(`${side}-types`);

    spriteEl.src = pokemon.sprite;
    nameEl.textContent = pokemon.name;
    hpTextEl.textContent = `${pokemon.currentHp}/${pokemon.maxHp}`;

    const hpPercent = (pokemon.currentHp / pokemon.maxHp) * 100;
    hpFillEl.style.width = hpPercent + '%';
    updateHpColor(hpFillEl, hpPercent);

    typesEl.innerHTML = pokemon.types.map(type =>
        `<span class="type-badge type-${type}">${typeNamesChinese[type]}</span>`
    ).join('');
}

function updateHpColor(fillEl, percent) {
    fillEl.classList.remove('medium', 'low');
    if (percent <= 20) {
        fillEl.classList.add('low');
    } else if (percent <= 50) {
        fillEl.classList.add('medium');
    }
}

function showMoveMenu() {
    const menu = document.getElementById('move-menu');
    menu.classList.remove('hidden');

    // 顯示計時器
    showTimerWithCountdown();

    const activePokemon = gameState.playerTeam[gameState.playerActive];
    const buttons = document.querySelectorAll('.move-button');

    activePokemon.moves.forEach((move, index) => {
        buttons[index].querySelector('.move-name').textContent = move.name;
        const typeEl = buttons[index].querySelector('.move-type');
        typeEl.textContent = typeNamesChinese[move.type];
        typeEl.className = `move-type type-${move.type}`;
    });
}

document.querySelectorAll('.move-button').forEach((btn, index) => {
    btn.addEventListener('click', async () => {
        stopTimer(); // 停止計時器
        hideTimerDisplay();
        document.getElementById('move-menu').classList.add('hidden');

        const activePokemon = gameState.playerTeam[gameState.playerActive];
        const move = activePokemon.moves[index];

        // Upload move to Firebase
        await gameState.roomRef.child(`${gameState.playerRole}/currentMove`).set(move);

        executeMove(move, true);
    });
});

async function executeMove(move, isPlayerAttacking) {
    const attacker = isPlayerAttacking ? gameState.playerTeam[gameState.playerActive] : gameState.enemyTeam[gameState.enemyActive];
    const defender = isPlayerAttacking ? gameState.enemyTeam[gameState.enemyActive] : gameState.playerTeam[gameState.playerActive];

    showMessage(`${attacker.name} 使用了 ${move.name}！`);

    // Attack animation
    const attackerSprite = document.getElementById(isPlayerAttacking ? 'player-sprite' : 'enemy-sprite');
    attackerSprite.classList.add('attack-animation');

    setTimeout(() => {
        attackerSprite.classList.remove('attack-animation');

        // Damage calculation
        const effectiveness = calculateEffectiveness(move.type, defender.types);
        const damage = Math.floor((move.power * (attacker.stats.attack / defender.stats.defense) * effectiveness) / 5);

        defender.currentHp = Math.max(0, defender.currentHp - damage);

        // Hurt animation
        const defenderSprite = document.getElementById(isPlayerAttacking ? 'enemy-sprite' : 'player-sprite');
        defenderSprite.classList.add('shake-animation', 'flash-animation');

        // Particle effect
        createParticles(move.type);

        setTimeout(() => {
            defenderSprite.classList.remove('shake-animation', 'flash-animation');

            // Update HP
            displayPokemon(isPlayerAttacking ? 'enemy' : 'player', defender);

            // Sync HP to Firebase
            syncTeamToFirebase();

            // Check if fainted
            if (defender.currentHp <= 0) {
                handleFaint(isPlayerAttacking);
            } else {
                // Switch turn
                switchTurn();
            }
        }, 800);
    }, 600);
}

function calculateEffectiveness(moveType, defenderTypes) {
    let multiplier = 1;
    const chart = typeChart[moveType];

    if (chart) {
        defenderTypes.forEach(type => {
            if (chart.strong?.includes(type)) multiplier *= 2;
            if (chart.weak?.includes(type)) multiplier *= 0.5;
        });
    }

    return multiplier;
}

function createParticles(type) {
    const canvas = document.getElementById('particle-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = {
        fire: ['#ff6b35', '#f7931e', '#ffd700'],
        water: ['#4fc3f7', '#29b6f6', '#0277bd'],
        grass: ['#81c784', '#66bb6a', '#4caf50'],
        electric: ['#ffd54f', '#ffeb3b', '#f9a825']
    };

    const colorSet = colors[type] || ['#999', '#aaa', '#bbb'];

    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const color = colorSet[Math.floor(Math.random() * colorSet.length)];

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, Math.random() * 5 + 3, 0, Math.PI * 2);
            ctx.fill();
        }, i * 30);
    }

    setTimeout(() => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 1000);
}

async function syncTeamToFirebase() {
    // Save current team state to Firebase
    await gameState.roomRef.child(`${gameState.playerRole}/team`).set(
        gameState.playerTeam.map(p => ({
            id: p.id,
            name: p.name,
            sprite: p.sprite,
            types: p.types,
            stats: p.stats,
            moves: p.moves,
            currentHp: p.currentHp,
            maxHp: p.maxHp
        }))
    );
}

async function switchTurn() {
    const nextTurn = gameState.currentTurn === 'player1' ? 'player2' : 'player1';
    await gameState.roomRef.child('currentTurn').set(nextTurn);
}

function handleFaint(isEnemyFainted) {
    const faintedSide = isEnemyFainted ? 'enemy' : 'player';
    const team = isEnemyFainted ? gameState.enemyTeam : gameState.playerTeam;
    const activeIndex = isEnemyFainted ? gameState.enemyActive : gameState.playerActive;

    showMessage(`${team[activeIndex].name} 失去了戰鬥能力！`);

    // Update pokeball counter
    const balls = document.querySelectorAll(`.${faintedSide}-balls .pokeball`);
    balls[activeIndex].classList.remove('active');

    setTimeout(() => {
        // Check for next Pokemon
        let nextIndex = -1;
        for (let i = 0; i < team.length; i++) {
            if (team[i].currentHp > 0) {
                nextIndex = i;
                break;
            }
        }

        if (nextIndex === -1) {
            // No more Pokemon - battle end
            endBattle(!isEnemyFainted);
        } else {
            // Switch to next Pokemon
            if (isEnemyFainted) {
                gameState.enemyActive = nextIndex;
                displayPokemon('enemy', gameState.enemyTeam[nextIndex]);
            } else {
                gameState.playerActive = nextIndex;
                displayPokemon('player', gameState.playerTeam[nextIndex]);
                // Sync active Pokemon to Firebase
                gameState.roomRef.child(`${gameState.playerRole}/activePokemon`).set(nextIndex);
            }
            showMessage(`上場：${team[nextIndex].name}！`);
            setTimeout(switchTurn, 2000);
        }
    }, 2000);
}

function endBattle(playerWon) {
    const overlay = document.getElementById('result-overlay');
    const title = document.getElementById('result-title');
    const message = document.getElementById('result-message');

    if (playerWon) {
        title.textContent = '勝利！';
        message.textContent = '你贏得了這場對戰！';
    } else {
        title.textContent = '戰敗';
        title.style.background = 'linear-gradient(45deg, #666, #999)';
        message.textContent = '你輸掉了這場對戰...';
    }

    overlay.classList.remove('hidden');
}

// ===== TIMER MANAGEMENT =====
function startTimer() {
    stopTimer(); // Clear any existing timer
    gameState.timeRemaining = CONFIG.TURN_TIME_LIMIT;
    updateTimerDisplay();

    gameState.timerInterval = setInterval(() => {
        gameState.timeRemaining--;
        updateTimerDisplay();

        if (gameState.timeRemaining <= 0) {
            // 時間到，自動隨機使用技能
            stopTimer();
            autoSelectMove();
        }
    }, 1000);
}

function stopTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
}

function updateTimerDisplay() {
    const countdownEl = document.getElementById('countdown');
    if (countdownEl) {
        countdownEl.textContent = gameState.timeRemaining;

        // 更新顏色
        countdownEl.classList.remove('warning', 'critical');
        if (gameState.timeRemaining <= 5) {
            countdownEl.classList.add('critical');
        } else if (gameState.timeRemaining <= 10) {
            countdownEl.classList.add('warning');
        }
    }
}

function showWaitingMessage() {
    const timerDisplay = document.getElementById('timer-display');
    const timerText = document.getElementById('timer-text');
    const countdown = document.getElementById('countdown');

    timerText.textContent = '等待對手...';
    countdown.style.display = 'none';
    timerDisplay.classList.remove('hidden');
}

function hideTimerDisplay() {
    const timerDisplay = document.getElementById('timer-display');
    const countdown = document.getElementById('countdown');

    timerDisplay.classList.add('hidden');
    countdown.style.display = 'block';
}

function showTimerWithCountdown() {
    const timerDisplay = document.getElementById('timer-display');
    const timerText = document.getElementById('timer-text');
    const countdown = document.getElementById('countdown');

    timerText.textContent = '選擇招式';
    countdown.style.display = 'block';
    timerDisplay.classList.remove('hidden');
}

function autoSelectMove() {
    document.getElementById('move-menu').classList.add('hidden');

    const activePokemon = gameState.playerTeam[gameState.playerActive];
    const randomIndex = Math.floor(Math.random() * activePokemon.moves.length);
    const move = activePokemon.moves[randomIndex];

    showMessage('時間到！自動使用 ' + move.name + '！');

    setTimeout(async () => {
        // Upload move to Firebase
        await gameState.roomRef.child(`${gameState.playerRole}/currentMove`).set(move);
        executeMove(move, true);
    }, 1500);
}

document.getElementById('new-battle-btn').addEventListener('click', () => {
    clearGameState();
    location.reload();
});

// Initialize and attempt reconnection
console.log('寶可夢對戰系統已啟動！');

// 嘗試重新連線
(async () => {
    const reconnected = await attemptReconnect();
    if (reconnected) {
        console.log('成功重新連線！');
    } else {
        console.log('無保存的遊戲狀態，開始新遊戲');
    }
})();
