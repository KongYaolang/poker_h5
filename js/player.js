/**
 * 玩家相关类和函数
 */

// 玩家类型
const PLAYER_TYPE = {
    HUMAN: 'HUMAN',
    AI: 'AI'
};

// 玩家状态
const PLAYER_STATUS = {
    ACTIVE: 'ACTIVE',       // 活跃（可以行动）
    FOLDED: 'FOLDED',       // 已弃牌
    ALL_IN: 'ALL_IN',       // 已全押
    OUT: 'OUT'              // 出局（没有筹码）
};

// 玩家类
class Player {
    constructor(id, name, type, chips = 1000, position = 0) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.chips = chips;
        this.position = position;
        this.cards = [];
        this.status = PLAYER_STATUS.ACTIVE;
        this.currentBet = 0;
        this.totalBet = 0;
        this.isDealer = false;
        this.isCurrentPlayer = false;
        this.avatar = null;
    }
    
    // 重置玩家状态（新一轮开始）
    reset() {
        this.cards = [];
        this.status = this.chips > 0 ? PLAYER_STATUS.ACTIVE : PLAYER_STATUS.OUT;
        this.currentBet = 0;
        this.totalBet = 0; // 每局开始时重置总投注
        this.isCurrentPlayer = false;
        return this;
    }
    
    // 发牌给玩家
    receiveCards(cards) {
        this.cards = [...this.cards, ...cards];
        return this;
    }
    
    // 玩家下注
    bet(amount) {
        if (amount > this.chips) {
            amount = this.chips;
            this.status = PLAYER_STATUS.ALL_IN;
        }
        
        this.chips -= amount;
        this.currentBet += amount;
        this.totalBet += amount;
        
        return amount;
    }
    
    // 玩家弃牌
    fold() {
        this.status = PLAYER_STATUS.FOLDED;
        return this;
    }
    
    // 玩家跟注
    call(currentBet) {
        const amountToCall = currentBet - this.currentBet;
        return this.bet(amountToCall);
    }
    
    // 玩家加注
    raise(currentBet, raiseAmount) {
        const totalAmount = (currentBet - this.currentBet) + raiseAmount;
        return this.bet(totalAmount);
    }
    
    // 玩家全押
    allIn() {
        const amount = this.chips;
        this.status = PLAYER_STATUS.ALL_IN;
        this.chips = 0;
        this.currentBet += amount;
        this.totalBet += amount;
        return amount;
    }
    
    // 玩家赢得筹码
    winChips(amount) {
        this.chips += amount;
        return this;
    }
    
    // 检查玩家是否可以行动
    canAct() {
        return this.status === PLAYER_STATUS.ACTIVE && this.chips > 0;
    }
    
    // 设置为当前玩家
    setAsCurrent(isCurrent) {
        this.isCurrentPlayer = isCurrent;
        return this;
    }
    
    // 设置为庄家
    setAsDealer(isDealer) {
        this.isDealer = isDealer;
        return this;
    }
    
    // 获取玩家的手牌评估结果
    evaluateHand(communityCards) {
        return evaluateHand(this.cards, communityCards);
    }
}

// AI玩家决策逻辑
class AIPlayer extends Player {
    constructor(id, name, chips = 1000, position = 0) {
        super(id, name, PLAYER_TYPE.AI, chips, position);
    }
    
    // AI决策（简化版）
    makeDecision(gameState) {
        // 简单的AI逻辑
        const randomAction = Math.random();
        const currentBet = gameState.currentBet;
        const pot = gameState.pot;
        
        // 50%概率跟注，30%概率加注，20%概率弃牌
        if (randomAction < 0.5) {
            // 跟注
            return {
                action: 'call',
                amount: this.call(currentBet)
            };
        } else if (randomAction < 0.8) {
            // 加注 (10% ~ 30% 底池)
            const raiseAmount = Math.floor((0.1 + Math.random() * 0.2) * pot);
            return {
                action: 'raise',
                amount: this.raise(currentBet, raiseAmount)
            };
        } else {
            // 弃牌
            this.fold();
            return {
                action: 'fold',
                amount: 0
            };
        }
    }
} 