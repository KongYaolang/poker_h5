/**
 * 游戏UI渲染
 */

class PokerUI {
    constructor(game, canvas) {
        this.game = game;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.cardWidth = 70;
        this.cardHeight = 100;
        this.cardImages = {};
        this.avatarImages = {};
        this.isLandscape = true;
        this.animationFrameId = null;
        
        // 初始化
        this.init();
    }
    
    // 初始化UI
    init() {
        // 调整画布大小
        this.resizeCanvas();
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.render();
        });
        
        // 监听方向变化
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.resizeCanvas();
                this.render();
            }, 300);
        });
        
        return this;
    }
    
    // 调整画布大小
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.isLandscape = window.innerWidth > window.innerHeight;
        
        // 根据屏幕大小调整卡牌尺寸
        if (this.width < 600) {
            this.cardWidth = 50;
            this.cardHeight = 70;
        } else {
            this.cardWidth = 70;
            this.cardHeight = 100;
        }
    }
    
    // 加载资源
    async loadAssets() {
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
                                canvas.width = this.cardWidth;
                                canvas.height = this.cardHeight;
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
            
            // 加载音频
            const audioPromises = [
                AudioManager.load('deal', 'assets/sounds/deal.mp3')
                    .catch(() => console.warn('Failed to load deal sound')),
                AudioManager.load('bg', 'assets/sounds/bg.mp3')
                    .catch(() => console.warn('Failed to load background music'))
            ];
            
            // 等待所有资源加载完成
            await Promise.all([...cardImagePromises, ...audioPromises]);
            
            // 注意：不再自动播放背景音乐，而是在用户交互后播放
            // AudioManager.playBackground('bg'); - 已移除
            
            return true;
        } catch (error) {
            console.error('Error loading assets:', error);
            return false;
        }
    }
    
    // 开始渲染循环
    startRenderLoop() {
        const loop = () => {
            this.render();
            this.animationFrameId = requestAnimationFrame(loop);
        };
        
        this.animationFrameId = requestAnimationFrame(loop);
    }
    
    // 停止渲染循环
    stopRenderLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
    
    // 渲染游戏界面
    render() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // 绘制背景
        this.drawBackground();
        
        // 绘制玩家
        this.drawPlayers();
        
        // 绘制公共牌
        this.drawCommunityCards();
        
        // 绘制底池
        this.drawPot();
        
        // 绘制游戏阶段
        this.drawGamePhase();
        
        // 绘制赢家信息
        if (this.game.winners.length > 0) {
            this.drawWinners();
        }
    }
    
    // 绘制背景
    drawBackground() {
        // 绘制桌面背景
        this.ctx.fillStyle = '#0a5c36'; // 绿色桌面
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // 绘制桌面边框
        const tableWidth = this.isLandscape ? this.width * 0.8 : this.width * 0.9;
        const tableHeight = this.isLandscape ? this.height * 0.6 : this.height * 0.4; // 减小高度，向上移动
        const tableX = (this.width - tableWidth) / 2;
        const tableY = (this.height * 0.4 - tableHeight / 2); // 将桌子向上移动到40%的位置
        
        this.ctx.fillStyle = '#0d8048'; // 深绿色桌面
        this.ctx.beginPath();
        this.ctx.ellipse(
            this.width / 2, 
            this.height * 0.4, // 中心点向上移动
            tableWidth / 2, 
            tableHeight / 2, 
            0, 0, Math.PI * 2
        );
        this.ctx.fill();
        
        // 绘制桌面边缘
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 6;
        this.ctx.stroke();
    }
    
    // 绘制玩家
    drawPlayers() {
        const players = this.game.players;
        const centerX = this.width / 2;
        const centerY = this.height * 0.4; // 中心点向上移动到40%的位置
        const radius = Math.min(this.width, this.height) * 0.3; // 减小半径
        
        players.forEach((player, index) => {
            // 计算玩家位置
            // 人类玩家固定在底部中间，AI玩家分布在上半圆
            let angle, x, y;
            
            if (player.type === PLAYER_TYPE.HUMAN) {
                // 人类玩家位置
                x = centerX;
                y = this.height - 150; // 距离底部150像素，为按钮留出空间
            } else {
                // AI玩家位置，在上半圆均匀分布
                const aiCount = players.filter(p => p.type === PLAYER_TYPE.AI).length;
                const aiIndex = players.filter((p, i) => p.type === PLAYER_TYPE.AI && i < index).length;
                angle = Math.PI * (0.2 + (0.6 * aiIndex / (aiCount - 1))); // 分布在0.2π到0.8π之间
                x = centerX + Math.cos(angle) * radius;
                y = centerY - Math.sin(angle) * radius * 0.8; // 压缩垂直高度
            }
            
            // 绘制玩家头像
            this.drawPlayerAvatar(player, x, y);
            
            // 绘制玩家信息
            this.drawPlayerInfo(player, x, y);
            
            // 绘制玩家手牌
            this.drawPlayerCards(player, x, y);
            
            // 始终绘制玩家当前投注
            this.drawPlayerBet(player, x, y);
            
            // 绘制庄家标记
            if (player.isDealer) {
                this.drawDealerButton(x, y);
            }
            
            // 绘制当前玩家高亮
            if (player.isCurrentPlayer) {
                this.drawCurrentPlayerHighlight(x, y);
            }
        });
    }
    
    // 绘制玩家头像
    drawPlayerAvatar(player, x, y) {
        const radius = player.type === PLAYER_TYPE.HUMAN ? 40 : 30; // 人类玩家头像更大
        
        // 绘制头像背景
        this.ctx.fillStyle = player.type === PLAYER_TYPE.HUMAN ? '#1a237e' : '#333';
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 绘制头像
        this.ctx.fillStyle = player.type === PLAYER_TYPE.HUMAN ? '#3949ab' : '#ddd';
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 绘制玩家ID
        this.ctx.fillStyle = '#fff';
        this.ctx.font = player.type === PLAYER_TYPE.HUMAN ? 'bold 18px Arial' : '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(player.name, x, y);
    }
    
    // 绘制玩家信息
    drawPlayerInfo(player, x, y) {
        const yOffset = player.type === PLAYER_TYPE.HUMAN ? 55 : 45;
        
        // 绘制玩家筹码
        this.ctx.fillStyle = '#fff';
        this.ctx.font = player.type === PLAYER_TYPE.HUMAN ? 'bold 16px Arial' : '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`${player.chips}`, x, y + yOffset);
        
        // 绘制玩家状态
        if (player.status !== PLAYER_STATUS.ACTIVE) {
            this.ctx.fillStyle = player.status === PLAYER_STATUS.FOLDED ? '#ff4444' : '#ffaa00';
            this.ctx.font = player.type === PLAYER_TYPE.HUMAN ? '14px Arial' : '12px Arial';
            this.ctx.fillText(
                player.status === PLAYER_STATUS.FOLDED ? '弃牌' : 
                player.status === PLAYER_STATUS.ALL_IN ? '全押' : '出局', 
                x, y + yOffset + 20
            );
        }
    }
    
    // 绘制玩家手牌
    drawPlayerCards(player, x, y) {
        if (player.cards.length === 0) return;
        
        const cardSpacing = player.type === PLAYER_TYPE.HUMAN ? 10 : 5;
        const startX = x - ((player.cards.length * this.cardWidth) + ((player.cards.length - 1) * cardSpacing)) / 2;
        const startY = player.type === PLAYER_TYPE.HUMAN ? y - 120 : y - 80;
        
        player.cards.forEach((card, index) => {
            const cardX = startX + (this.cardWidth + cardSpacing) * index;
            this.drawCard(card, cardX, startY);
        });
    }
    
    // 绘制玩家下注
    drawPlayerBet(player, x, y) {
        // 计算投注显示位置
        let betX, betY;
        
        if (player.type === PLAYER_TYPE.HUMAN) {
            betX = x;
            betY = y - 30;
        } else {
            betX = x;
            betY = y + 30;
        }
        
        // 绘制总投注金额
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.ctx.beginPath();
        this.ctx.roundRect(betX - 40, betY - 12, 80, 24, 12);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#ffdd00';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`投注: ${player.totalBet}`, betX, betY);
        
        // 如果有当前投注，显示当前投注
        if (player.currentBet > 0) {
            // 绘制当前投注金额
            this.ctx.fillStyle = '#ffdd00';
            this.ctx.beginPath();
            this.ctx.arc(betX, betY - 30, 15, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = '#333';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(`${player.currentBet}`, betX, betY - 30);
        }
    }
    
    // 绘制庄家按钮
    drawDealerButton(x, y) {
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(x + 40, y, 10, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#333';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('D', x + 40, y);
    }
    
    // 绘制当前玩家高亮
    drawCurrentPlayerHighlight(x, y) {
        const radius = this.ctx.type === PLAYER_TYPE.HUMAN ? 45 : 35;
        
        // 绘制外圈光晕
        const gradient = this.ctx.createRadialGradient(x, y, radius, x, y, radius + 20);
        gradient.addColorStop(0, 'rgba(255, 221, 0, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 221, 0, 0)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius + 20, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 绘制高亮边框
        this.ctx.strokeStyle = '#ffdd00';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
    }
    
    // 绘制公共牌
    drawCommunityCards() {
        const cards = this.game.communityCards;
        if (cards.length === 0) return;
        
        const cardSpacing = 10;
        const totalWidth = (cards.length * this.cardWidth) + ((cards.length - 1) * cardSpacing);
        const startX = (this.width - totalWidth) / 2;
        const startY = (this.height * 0.3); // 将公共牌移到画面上方30%的位置
        
        cards.forEach((card, index) => {
            const cardX = startX + (this.cardWidth + cardSpacing) * index;
            this.drawCard(card, cardX, startY);
        });
    }
    
    // 绘制底池
    drawPot() {
        if (this.game.pot === 0) return;
        
        // 绘制底池背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.beginPath();
        this.ctx.roundRect(
            this.width / 2 - 50, 
            this.height * 0.2, // 将底池信息移到画面上方20%的位置
            100, 
            30, 
            5
        );
        this.ctx.fill();
        
        // 绘制底池文本
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`底池: ${this.game.pot}`, this.width / 2, this.height * 0.2 + 15);
    }
    
    // 绘制游戏阶段
    drawGamePhase() {
        // 绘制阶段背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.beginPath();
        this.ctx.roundRect(
            this.width / 2 - 60, 
            20, 
            120, 
            30, 
            5
        );
        this.ctx.fill();
        
        // 绘制阶段文本
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        let phaseText = '';
        switch (this.game.phase) {
            case GAME_PHASE.WAITING:
                phaseText = '等待开始';
                break;
            case GAME_PHASE.DEALING:
                phaseText = '发牌中';
                break;
            case GAME_PHASE.PRE_FLOP:
                phaseText = '翻牌前';
                break;
            case GAME_PHASE.FLOP:
                phaseText = '翻牌圈';
                break;
            case GAME_PHASE.TURN:
                phaseText = '转牌圈';
                break;
            case GAME_PHASE.RIVER:
                phaseText = '河牌圈';
                break;
            case GAME_PHASE.SHOWDOWN:
                phaseText = '摊牌';
                break;
            default:
                phaseText = '';
        }
        
        this.ctx.fillText(phaseText, this.width / 2, 35);
    }
    
    // 绘制赢家信息
    drawWinners() {
        // 绘制赢家背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.beginPath();
        this.ctx.roundRect(
            this.width / 2 - 100, 
            this.height / 2 + 50, 
            200, 
            40, 
            5
        );
        this.ctx.fill();
        
        // 绘制赢家文本
        this.ctx.fillStyle = '#ffdd00';
        this.ctx.font = '18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        const winnerNames = this.game.winners.map(w => w.name).join(', ');
        this.ctx.fillText(`赢家: ${winnerNames}`, this.width / 2, this.height / 2 + 70);
    }
    
    // 绘制卡牌
    drawCard(card, x, y) {
        if (!card) return;
        
        // 获取卡牌图片
        const imageName = card.faceUp ? card.getImageName() : 'back';
        const cardImage = ImageLoader.getImage(imageName);
        
        if (cardImage) {
            // 绘制卡牌图片
            this.ctx.drawImage(cardImage, x, y, this.cardWidth, this.cardHeight);
        } else {
            // 如果图片未加载，绘制文本替代
            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(x, y, this.cardWidth, this.cardHeight);
            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x, y, this.cardWidth, this.cardHeight);
            
            if (card.faceUp) {
                this.ctx.fillStyle = (card.suit === 'H' || card.suit === 'D') ? 'red' : 'black';
                this.ctx.font = 'bold 16px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(card.toString(), x + this.cardWidth / 2, y + this.cardHeight / 2);
            } else {
                // 绘制卡牌背面花纹
                this.ctx.fillStyle = '#6c6c6c';
                this.ctx.font = 'bold 20px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('♠♥♦♣', x + this.cardWidth / 2, y + this.cardHeight / 2);
            }
        }
    }
} 