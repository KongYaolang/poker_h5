/**
 * 游戏核心逻辑
 */

// 游戏阶段
const GAME_PHASE = {
    WAITING: 'WAITING',           // 等待开始
    DEALING: 'DEALING',           // 发牌阶段
    PRE_FLOP: 'PRE_FLOP',         // 翻牌前
    FLOP: 'FLOP',                 // 翻牌
    TURN: 'TURN',                 // 转牌
    RIVER: 'RIVER',               // 河牌
    SHOWDOWN: 'SHOWDOWN',         // 摊牌
    GAME_OVER: 'GAME_OVER'        // 游戏结束
};

// 游戏类
class PokerGame {
    constructor() {
        this.players = [];
        this.deck = new Deck();
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.currentPlayerIndex = 0;
        this.dealerIndex = 0;
        this.phase = GAME_PHASE.WAITING;
        this.winners = [];
        this.smallBlind = 10;
        this.bigBlind = 20;
        this.minRaise = this.bigBlind;
        
        // 添加收益统计
        this.totalProfit = 0;
        this.roundProfit = 0;
        this.initialChips = 1000;
    }
    
    // 初始化游戏
    init() {
        // 创建玩家（1个人类玩家，3个AI玩家）
        this.players = [
            new Player(1, '玩家', PLAYER_TYPE.HUMAN, this.initialChips, 0),
            new AIPlayer(2, 'AI 1', this.initialChips, 1),
            new AIPlayer(3, 'AI 2', this.initialChips, 2),
            new AIPlayer(4, 'AI 3', this.initialChips, 3)
        ];
        
        // 设置玩家头像
        this.players[0].avatar = 'player';
        this.players[1].avatar = 'ai1';
        this.players[2].avatar = 'ai2';
        this.players[3].avatar = 'ai3';
        
        // 随机选择庄家
        this.dealerIndex = Math.floor(Math.random() * this.players.length);
        this.players[this.dealerIndex].setAsDealer(true);
        
        return this;
    }
    
    // 开始新一轮游戏
    startNewRound() {
        // 重置本局收益
        this.roundProfit = 0;
        
        // 重置游戏状态
        this.resetGame();
        
        // 发底牌
        this.dealHoleCards();
        
        // 设置当前玩家（从庄家之后的第一个玩家开始）
        this.currentPlayerIndex = (this.dealerIndex + 1) % this.players.length;
        this.players[this.currentPlayerIndex].setAsCurrent(true);
        
        // 设置游戏阶段
        this.phase = GAME_PHASE.PRE_FLOP;
        
        // 收取盲注
        this.collectBlinds();
        
        // 如果当前玩家是AI，让AI行动
        this.processAITurn();
        
        return this;
    }
    
    // 重置游戏状态
    resetGame() {
        // 重置牌组
        this.deck.reset().shuffle();
        
        // 重置公共牌
        this.communityCards = [];
        
        // 重置底池和当前下注
        this.pot = 0;
        this.currentBet = 0;
        this.minRaise = this.bigBlind;
        
        // 重置玩家状态
        this.players.forEach(player => player.reset());
        
        // 移动庄家位置
        this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
        this.players.forEach((player, index) => {
            player.setAsDealer(index === this.dealerIndex);
        });
        
        // 重置赢家
        this.winners = [];
        
        return this;
    }
    
    // 发底牌
    dealHoleCards() {
        // 每个玩家发2张底牌
        for (let i = 0; i < 2; i++) {
            for (let player of this.players) {
                if (player.status !== PLAYER_STATUS.OUT) {
                    const card = this.deck.deal(1)[0];
                    // 如果是人类玩家，翻开牌
                    if (player.type === PLAYER_TYPE.HUMAN) {
                        card.flip();
                    }
                    player.receiveCards([card]);
                    
                    // 播放发牌音效
                    AudioManager.play('deal');
                }
            }
        }
        
        return this;
    }
    
    // 收取盲注
    collectBlinds() {
        // 小盲注（庄家之后的第一个玩家）
        const smallBlindIndex = (this.dealerIndex + 1) % this.players.length;
        const smallBlindAmount = this.players[smallBlindIndex].bet(this.smallBlind);
        this.pot += smallBlindAmount;
        
        // 大盲注（小盲注之后的玩家）
        const bigBlindIndex = (smallBlindIndex + 1) % this.players.length;
        const bigBlindAmount = this.players[bigBlindIndex].bet(this.bigBlind);
        this.pot += bigBlindAmount;
        
        // 设置当前下注为大盲注
        this.currentBet = this.bigBlind;
        
        // 设置当前玩家（大盲注之后的玩家）
        this.currentPlayerIndex = (bigBlindIndex + 1) % this.players.length;
        this.players.forEach((player, index) => {
            player.setAsCurrent(index === this.currentPlayerIndex);
        });
        
        return this;
    }
    
    // 处理玩家行动
    handlePlayerAction(action, amount = 0) {
        const currentPlayer = this.players[this.currentPlayerIndex];
        let actionAmount = 0;
        
        // 根据行动类型处理
        switch (action) {
            case 'fold':
                currentPlayer.fold();
                break;
                
            case 'check':
                // 检查只有在当前玩家已经下注等于当前最高下注时才有效
                if (currentPlayer.currentBet < this.currentBet) {
                    console.warn('Invalid check action');
                    return false;
                }
                break;
                
            case 'call':
                actionAmount = currentPlayer.call(this.currentBet);
                this.pot += actionAmount;
                break;
                
            case 'raise':
                // 确保加注金额至少为最小加注
                if (amount < this.minRaise) {
                    amount = this.minRaise;
                }
                
                actionAmount = currentPlayer.raise(this.currentBet, amount);
                this.pot += actionAmount;
                this.currentBet = currentPlayer.currentBet;
                this.minRaise = amount; // 更新最小加注金额
                break;
                
            case 'allIn':
                actionAmount = currentPlayer.allIn();
                this.pot += actionAmount;
                if (currentPlayer.currentBet > this.currentBet) {
                    this.currentBet = currentPlayer.currentBet;
                }
                break;
                
            default:
                console.warn('Invalid action');
                return false;
        }
        
        // 移动到下一个玩家
        this.moveToNextPlayer();
        
        // 检查当前回合是否结束
        if (this.isRoundComplete()) {
            this.advanceToNextPhase();
        }
        
        // 如果当前玩家是AI，让AI行动
        this.processAITurn();
        
        return true;
    }
    
    // 移动到下一个玩家
    moveToNextPlayer() {
        // 取消当前玩家的高亮
        this.players[this.currentPlayerIndex].setAsCurrent(false);
        
        // 找到下一个可以行动的玩家
        let nextPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        while (
            nextPlayerIndex !== this.currentPlayerIndex && 
            (this.players[nextPlayerIndex].status !== PLAYER_STATUS.ACTIVE || 
             this.players[nextPlayerIndex].chips === 0)
        ) {
            nextPlayerIndex = (nextPlayerIndex + 1) % this.players.length;
        }
        
        // 如果回到了当前玩家，说明没有其他玩家可以行动
        if (nextPlayerIndex === this.currentPlayerIndex) {
            // 如果当前玩家也不能行动，结束当前回合
            if (this.players[nextPlayerIndex].status !== PLAYER_STATUS.ACTIVE || 
                this.players[nextPlayerIndex].chips === 0) {
                this.advanceToNextPhase();
                return;
            }
        }
        
        // 设置新的当前玩家
        this.currentPlayerIndex = nextPlayerIndex;
        this.players[this.currentPlayerIndex].setAsCurrent(true);
    }
    
    // 检查当前回合是否结束
    isRoundComplete() {
        // 如果只有一个玩家没有弃牌，回合结束
        const activePlayers = this.players.filter(player => 
            player.status !== PLAYER_STATUS.FOLDED && 
            player.status !== PLAYER_STATUS.OUT
        );
        
        if (activePlayers.length === 1) {
            return true;
        }
        
        // 检查所有玩家是否都已经行动且下注相等或全押
        const allPlayersActed = this.players.every(player => 
            player.status === PLAYER_STATUS.FOLDED || 
            player.status === PLAYER_STATUS.OUT || 
            player.status === PLAYER_STATUS.ALL_IN || 
            player.currentBet === this.currentBet
        );
        
        return allPlayersActed;
    }
    
    // 进入下一个游戏阶段
    advanceToNextPhase() {
        // 根据当前阶段确定下一个阶段
        switch (this.phase) {
            case GAME_PHASE.PRE_FLOP:
                this.phase = GAME_PHASE.FLOP;
                this.dealCommunityCards(3); // 发3张翻牌
                break;
                
            case GAME_PHASE.FLOP:
                this.phase = GAME_PHASE.TURN;
                this.dealCommunityCards(1); // 发1张转牌
                break;
                
            case GAME_PHASE.TURN:
                this.phase = GAME_PHASE.RIVER;
                this.dealCommunityCards(1); // 发1张河牌
                break;
                
            case GAME_PHASE.RIVER:
                this.phase = GAME_PHASE.SHOWDOWN;
                this.determineWinner(); // 确定赢家
                break;
                
            case GAME_PHASE.SHOWDOWN:
                this.phase = GAME_PHASE.WAITING;
                // 可以在这里添加游戏结束的逻辑
                break;
        }
        
        // 重置当前下注和玩家下注状态
        if (this.phase !== GAME_PHASE.SHOWDOWN && this.phase !== GAME_PHASE.WAITING) {
            this.resetBets();
            
            // 设置当前玩家（从庄家之后的第一个活跃玩家开始）
            let nextPlayerIndex = (this.dealerIndex + 1) % this.players.length;
            while (
                this.players[nextPlayerIndex].status !== PLAYER_STATUS.ACTIVE || 
                this.players[nextPlayerIndex].chips === 0
            ) {
                nextPlayerIndex = (nextPlayerIndex + 1) % this.players.length;
                
                // 如果所有玩家都不能行动，直接进入摊牌阶段
                if (nextPlayerIndex === this.dealerIndex) {
                    this.phase = GAME_PHASE.SHOWDOWN;
                    this.determineWinner();
                    return;
                }
            }
            
            this.currentPlayerIndex = nextPlayerIndex;
            this.players.forEach((player, index) => {
                player.setAsCurrent(index === this.currentPlayerIndex);
            });
            
            // 如果当前玩家是AI，让AI行动
            this.processAITurn();
        }
    }
    
    // 发公共牌
    dealCommunityCards(count) {
        for (let i = 0; i < count; i++) {
            const card = this.deck.deal(1)[0];
            card.flip(); // 公共牌是翻开的
            this.communityCards.push(card);
            
            // 播放发牌音效
            AudioManager.play('deal');
        }
    }
    
    // 重置下注状态
    resetBets() {
        this.currentBet = 0;
        this.minRaise = this.bigBlind;
        this.players.forEach(player => {
            player.currentBet = 0;
        });
    }
    
    // 确定赢家
    determineWinner() {
        // 如果只有一个玩家没有弃牌，他就是赢家
        const activePlayers = this.players.filter(player => 
            player.status !== PLAYER_STATUS.FOLDED && 
            player.status !== PLAYER_STATUS.OUT
        );
        
        if (activePlayers.length === 1) {
            this.winners = [activePlayers[0]];
            this.awardPot();
            return;
        }
        
        // 翻开所有玩家的牌
        activePlayers.forEach(player => {
            player.cards.forEach(card => {
                if (!card.faceUp) {
                    card.flip();
                }
            });
        });
        
        // 评估每个玩家的手牌
        const playerHands = activePlayers.map(player => {
            return {
                player: player,
                hand: player.evaluateHand(this.communityCards)
            };
        });
        
        // 按照手牌大小排序
        playerHands.sort((a, b) => b.hand.value - a.hand.value);
        
        // 找出最大手牌的玩家
        const maxHandValue = playerHands[0].hand.value;
        this.winners = playerHands
            .filter(ph => ph.hand.value === maxHandValue)
            .map(ph => ph.player);
        
        // 分配奖池
        this.awardPot();
    }
    
    // 分配奖池
    awardPot() {
        if (this.winners.length === 0) return;
        
        // 简单平分奖池
        const winAmount = Math.floor(this.pot / this.winners.length);
        this.winners.forEach(winner => {
            winner.winChips(winAmount);
            
            // 如果赢家是人类玩家，计算收益
            if (winner.type === PLAYER_TYPE.HUMAN) {
                // 本局收益 = 赢得的筹码 - 本局投入的筹码
                this.roundProfit = winAmount - winner.totalBet;
                // 更新总收益
                this.totalProfit += this.roundProfit;
            }
        });
        
        // 处理可能的零头
        const remainder = this.pot - (winAmount * this.winners.length);
        if (remainder > 0) {
            this.winners[0].winChips(remainder);
            if (this.winners[0].type === PLAYER_TYPE.HUMAN) {
                this.roundProfit += remainder;
                this.totalProfit += remainder;
            }
        }
        
        // 清空奖池
        this.pot = 0;
        
        // 触发回合结束事件
        EventBus.emit('roundEnd', {
            roundProfit: this.roundProfit,
            totalProfit: this.totalProfit,
            remainingChips: this.getHumanPlayer().chips
        });
    }
    
    // 获取人类玩家
    getHumanPlayer() {
        return this.players.find(player => player.type === PLAYER_TYPE.HUMAN);
    }
    
    // 检查游戏是否应该结束
    checkGameOver() {
        const humanPlayer = this.getHumanPlayer();
        return humanPlayer.chips <= 0;
    }
    
    // 处理AI玩家回合
    processAITurn() {
        // 如果当前玩家是AI，让AI行动
        const currentPlayer = this.players[this.currentPlayerIndex];
        if (currentPlayer.type === PLAYER_TYPE.AI && currentPlayer.canAct()) {
            // 延迟一下，模拟AI思考
            setTimeout(() => {
                const gameState = {
                    currentBet: this.currentBet,
                    pot: this.pot,
                    communityCards: this.communityCards,
                    phase: this.phase
                };
                
                const decision = currentPlayer.makeDecision(gameState);
                this.handlePlayerAction(decision.action, decision.amount);
            }, 1000);
        }
    }
    
    // 获取游戏状态（用于UI更新）
    getGameState() {
        return {
            players: this.players,
            communityCards: this.communityCards,
            pot: this.pot,
            currentBet: this.currentBet,
            currentPlayerIndex: this.currentPlayerIndex,
            dealerIndex: this.dealerIndex,
            phase: this.phase,
            winners: this.winners
        };
    }
} 