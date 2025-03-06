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
    
    // 创建游戏实例
    const game = new PokerGame().init();
    
    // 创建UI实例
    const ui = new PokerUI(game, canvas);
    
    // 加载资源（但不播放音频）
    try {
        // 修改加载资源的方法，但不自动播放背景音乐
        await loadGameAssets(ui);
        
        // 隐藏加载提示
        loadingElement.classList.add('hidden');
        
        // 显示开始对话框
        startDialogElement.classList.remove('hidden');
        
        // 绑定开始按钮事件
        startButton.addEventListener('click', () => {
            // 隐藏开始对话框
            startDialogElement.classList.add('hidden');
            
            // 显示控制按钮
            controlsElement.classList.remove('hidden');
            
            // 播放背景音乐（现在可以播放了，因为有了用户交互）
            AudioManager.playBackground('bg');
            
            // 开始渲染循环
            ui.startRenderLoop();
            
            // 开始游戏
            game.startNewRound();
            
            // 绑定按钮事件
            bindControls(game, ui);
        });
        
    } catch (error) {
        console.error('Failed to load game assets:', error);
        loadingElement.textContent = '加载失败，请刷新重试';
    }
});

// 加载游戏资源但不播放音频
async function loadGameAssets(ui) {
    try {
        // 加载卡牌图片
        const cardImagePromises = [];
        
        // 加载背面图片
        cardImagePromises.push(
            ImageLoader.loadImage('back', 'assets/cards/back.png')
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
                            const canvas = document.createElement('canvas');
                            canvas.width = ui.cardWidth;
                            canvas.height = ui.cardHeight;
                            const ctx = canvas.getContext('2d');
                            
                            // 绘制卡牌背景
                            ctx.fillStyle = 'white';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            ctx.strokeStyle = 'black';
                            ctx.lineWidth = 2;
                            ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
                            
                            // 绘制卡牌文本
                            ctx.fillStyle = (suit === 'H' || suit === 'D') ? 'red' : 'black';
                            ctx.font = 'bold 20px Arial';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(cardName, canvas.width / 2, canvas.height / 2);
                            
                            // 创建图片对象
                            const img = new Image();
                            img.src = canvas.toDataURL();
                            ImageLoader.images[cardName] = img;
                            return img;
                        })
                );
            }
        }
        
        // 加载音频（但不播放）
        const audioPromises = [
            AudioManager.load('deal', 'assets/sounds/deal.mp3')
                .catch(() => console.warn('Failed to load deal sound')),
            AudioManager.load('bg', 'assets/sounds/bg.mp3')
                .catch(() => console.warn('Failed to load background music'))
        ];
        
        // 等待所有资源加载完成
        await Promise.all([...cardImagePromises, ...audioPromises]);
        
        return true;
    } catch (error) {
        console.error('Error loading assets:', error);
        return false;
    }
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