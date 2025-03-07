/**
 * 游戏主入口
 */

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', async () => {
    // 获取游戏画布和元素
    const canvas = document.getElementById('game-canvas');
    const loadingElement = document.getElementById('loading');
    const controlsElement = document.getElementById('controls');
    const startDialogElement = document.getElementById('start-dialog');
    const startButton = document.getElementById('start-btn');
    const roundEndDialogElement = document.getElementById('round-end-dialog');
    const nextRoundButton = document.getElementById('next-round-btn');
    
    // 创建游戏实例
    const game = new PokerGame().init();
    
    // 创建UI实例
    const ui = new PokerUI(game, canvas);
    
    // 监听回合结束事件
    EventBus.on('roundEnd', (data) => {
        // 更新统计信息
        document.getElementById('round-profit').textContent = formatProfit(data.roundProfit);
        document.getElementById('round-profit').className = data.roundProfit >= 0 ? 'profit' : 'loss';
        document.getElementById('total-profit').textContent = formatProfit(data.totalProfit);
        document.getElementById('total-profit').className = data.totalProfit >= 0 ? 'profit' : 'loss';
        document.getElementById('remaining-chips').textContent = data.remainingChips;
        
        // 显示回合结束对话框
        roundEndDialogElement.classList.remove('hidden');
        
        // 禁用控制按钮
        controlsElement.classList.add('hidden');
    });
    
    // 绑定下一局按钮事件
    nextRoundButton.addEventListener('click', () => {
        // 检查游戏是否结束
        if (game.checkGameOver()) {
            // 游戏结束，显示开始对话框重新开始
            startDialogElement.classList.remove('hidden');
            roundEndDialogElement.classList.add('hidden');
            // 重置游戏
            game.init();
        } else {
            // 隐藏回合结束对话框
            roundEndDialogElement.classList.add('hidden');
            // 显示控制按钮
            controlsElement.classList.remove('hidden');
            // 开始新一轮
            game.startNewRound();
        }
    });
    
    // 设置加载超时保障
    const globalLoadingTimeout = setTimeout(() => {
        console.warn('全局加载超时，强制启动游戏');
        loadingElement.classList.add('hidden');
        startDialogElement.classList.remove('hidden');
        
        // 绑定开始按钮事件
        bindStartButton();
    }, 15000); // 15秒全局超时
    
    // 加载资源（但不播放音频）
    try {
        // 修改加载资源的方法，但不自动播放背景音乐
        const assetsLoaded = await loadGameAssets(ui);
        
        // 清除全局超时
        clearTimeout(globalLoadingTimeout);
        
        // 隐藏加载提示
        loadingElement.classList.add('hidden');
        
        // 显示开始对话框
        startDialogElement.classList.remove('hidden');
        
        // 绑定开始按钮事件
        bindStartButton();
        
    } catch (error) {
        console.error('Failed to load game assets:', error);
        // 清除全局超时
        clearTimeout(globalLoadingTimeout);
        
        // 即使加载失败，也尝试启动游戏
        loadingElement.classList.add('hidden');
        startDialogElement.classList.remove('hidden');
        
        // 绑定开始按钮事件
        bindStartButton();
    }
    
    // 绑定开始按钮事件的函数
    function bindStartButton() {
        // 移除之前可能存在的事件监听器
        startButton.removeEventListener('click', startGameHandler);
        // 添加新的事件监听器
        startButton.addEventListener('click', startGameHandler);
    }
    
    // 开始游戏的处理函数
    function startGameHandler() {
        // 隐藏开始对话框
        startDialogElement.classList.add('hidden');
        
        // 显示控制按钮
        controlsElement.classList.remove('hidden');
        
        // 尝试播放背景音乐（现在可以播放了，因为有了用户交互）
        try {
            AudioManager.playBackground('bg');
        } catch (e) {
            console.warn('无法播放背景音乐:', e);
        }
        
        // 开始渲染循环
        ui.startRenderLoop();
        
        // 开始游戏
        game.startNewRound();
        
        // 绑定按钮事件
        bindControls(game, ui);
    }
});

// 格式化收益显示
function formatProfit(profit) {
    return profit >= 0 ? `+${profit}` : `${profit}`;
}

// 加载游戏资源但不播放音频
async function loadGameAssets(ui) {
    try {
        // 设置加载超时
        const loadingTimeout = setTimeout(() => {
            console.warn('资源加载超时，尝试继续游戏');
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('start-dialog').classList.remove('hidden');
        }, 10000); // 10秒超时
        
        // 加载卡牌图片
        const cardImagePromises = [];
        
        // 加载背面图片
        cardImagePromises.push(
            ImageLoader.loadImage('back', 'assets/cards/back.png')
                .catch(err => {
                    console.warn('Failed to load card back image, using fallback');
                    // 创建一个文本替代图片
                    return createFallbackCardImage('back', 'black');
                })
        );
        
        // 加载所有牌面图片
        for (const suit of Object.values(SUITS)) {
            for (const rank of Object.values(RANKS)) {
                const cardName = `${rank}${suit}`;
                cardImagePromises.push(
                    ImageLoader.loadImage(cardName, `assets/cards/${cardName}.png`)
                        .catch(() => {
                            console.warn(`Failed to load card image: ${cardName}`);
                            // 创建一个文本替代图片
                            return createFallbackCardImage(cardName, (suit === 'H' || suit === 'D') ? 'red' : 'black');
                        })
                );
            }
        }
        
        // 加载音频（但不播放）- 使用超时处理避免音频加载阻塞
        // 注意：我们不再等待音频加载完成，而是设置一个短超时
        // 这样即使音频文件有问题，也不会阻塞游戏启动
        const audioPromises = [];
        
        // 尝试加载发牌音效，但设置很短的超时
        audioPromises.push(
            Promise.race([
                AudioManager.load('deal', 'assets/sounds/deal.mp3'),
                new Promise(resolve => setTimeout(() => {
                    console.warn('Deal sound load timeout');
                    resolve(null);
                }, 1000)) // 只等待1秒
            ]).catch(() => {
                console.warn('Failed to load deal sound');
                return null;
            })
        );
        
        // 尝试加载背景音乐，但设置较短的超时
        audioPromises.push(
            Promise.race([
                AudioManager.load('bg', 'assets/sounds/bg.mp3'),
                new Promise(resolve => setTimeout(() => {
                    console.warn('Background music load timeout');
                    resolve(null);
                }, 3000)) // 等待3秒
            ]).catch(() => {
                console.warn('Failed to load background music');
                return null;
            })
        );
        
        // 先等待图片加载完成
        await Promise.all(cardImagePromises);
        
        // 不等待音频加载完成，只是启动加载过程
        // 这样即使音频有问题，也不会阻塞游戏
        
        // 清除超时
        clearTimeout(loadingTimeout);
        
        return true;
    } catch (error) {
        console.error('Error loading assets:', error);
        // 即使加载失败，也允许游戏继续
        return true;
    }
}

// 创建备用卡牌图片
function createFallbackCardImage(cardName, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 80; // 默认宽度
    canvas.height = 120; // 默认高度
    const ctx = canvas.getContext('2d');
    
    // 绘制卡牌背景
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    
    // 绘制卡牌文本
    ctx.fillStyle = color;
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cardName, canvas.width / 2, canvas.height / 2);
    
    // 创建图片对象
    const img = new Image();
    img.src = canvas.toDataURL();
    ImageLoader.images[cardName] = img;
    return img;
}

// 绑定控制按钮
function bindControls(game, ui) {
    const foldBtn = document.getElementById('fold-btn');
    const checkBtn = document.getElementById('check-btn');
    const raiseBtn = document.getElementById('raise-btn');
    const allInBtn = document.getElementById('all-in-btn');
    
    // 弃牌按钮
    foldBtn.addEventListener('click', () => {
        const currentPlayer = game.players[game.currentPlayerIndex];
        if (currentPlayer.type === PLAYER_TYPE.HUMAN && currentPlayer.canAct()) {
            game.handlePlayerAction('fold');
        }
    });
    
    // 跟注/看牌按钮
    checkBtn.addEventListener('click', () => {
        const currentPlayer = game.players[game.currentPlayerIndex];
        if (currentPlayer.type === PLAYER_TYPE.HUMAN && currentPlayer.canAct()) {
            // 如果当前下注等于玩家下注，则为看牌，否则为跟注
            const action = currentPlayer.currentBet === game.currentBet ? 'check' : 'call';
            game.handlePlayerAction(action);
        }
    });
    
    // 加注按钮
    raiseBtn.addEventListener('click', () => {
        const currentPlayer = game.players[game.currentPlayerIndex];
        if (currentPlayer.type === PLAYER_TYPE.HUMAN && currentPlayer.canAct()) {
            // 简单起见，加注金额为当前底池的20%
            const raiseAmount = Math.max(game.minRaise, Math.floor(game.pot * 0.2));
            game.handlePlayerAction('raise', raiseAmount);
        }
    });
    
    // 全押按钮
    allInBtn.addEventListener('click', () => {
        const currentPlayer = game.players[game.currentPlayerIndex];
        if (currentPlayer.type === PLAYER_TYPE.HUMAN && currentPlayer.canAct()) {
            game.handlePlayerAction('allIn');
        }
    });
    
    // 添加触摸支持
    document.addEventListener('touchstart', handleTouch);
    
    // 添加键盘支持
    document.addEventListener('keydown', (e) => {
        const currentPlayer = game.players[game.currentPlayerIndex];
        if (currentPlayer.type === PLAYER_TYPE.HUMAN && currentPlayer.canAct()) {
            switch (e.key) {
                case 'f':
                    game.handlePlayerAction('fold');
                    break;
                case 'c':
                    const action = currentPlayer.currentBet === game.currentBet ? 'check' : 'call';
                    game.handlePlayerAction(action);
                    break;
                case 'r':
                    const raiseAmount = Math.max(game.minRaise, Math.floor(game.pot * 0.2));
                    game.handlePlayerAction('raise', raiseAmount);
                    break;
                case 'a':
                    game.handlePlayerAction('allIn');
                    break;
            }
        }
    });
    
    // 处理触摸事件
    function handleTouch(e) {
        // 防止默认行为（如滚动）
        e.preventDefault();
    }
    
    // 添加新一轮游戏按钮（当游戏结束时）
    canvas.addEventListener('click', () => {
        if (game.phase === GAME_PHASE.WAITING) {
            game.startNewRound();
        }
    });
    
    // 更新按钮状态
    function updateButtonStates() {
        const currentPlayer = game.players[game.currentPlayerIndex];
        const isHumanTurn = currentPlayer && 
                            currentPlayer.type === PLAYER_TYPE.HUMAN && 
                            currentPlayer.canAct();
        
        // 启用/禁用按钮
        foldBtn.disabled = !isHumanTurn;
        checkBtn.disabled = !isHumanTurn;
        raiseBtn.disabled = !isHumanTurn || currentPlayer.chips <= game.currentBet;
        allInBtn.disabled = !isHumanTurn || currentPlayer.chips === 0;
        
        // 更新跟注/看牌按钮文本
        if (isHumanTurn) {
            checkBtn.textContent = currentPlayer.currentBet === game.currentBet ? '看牌' : '跟注';
        }
    }
    
    // 监听游戏状态变化，更新按钮状态
    const gameStateObserver = setInterval(updateButtonStates, 100);
    
    // 初始更新按钮状态
    updateButtonStates();
} 