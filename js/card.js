/**
 * 扑克牌相关类和函数
 */

// 扑克牌花色
const SUITS = {
    SPADES: 'S',   // 黑桃
    HEARTS: 'H',   // 红心
    DIAMONDS: 'D', // 方块
    CLUBS: 'C'     // 梅花
};

// 扑克牌点数
const RANKS = {
    ACE: 'A',
    KING: 'K',
    QUEEN: 'Q',
    JACK: 'J',
    TEN: '10',
    NINE: '9',
    EIGHT: '8',
    SEVEN: '7',
    SIX: '6',
    FIVE: '5',
    FOUR: '4',
    THREE: '3',
    TWO: '2'
};

// 扑克牌类
class Card {
    constructor(rank, suit) {
        this.rank = rank;
        this.suit = suit;
        this.faceUp = false;
    }
    
    // 获取卡牌的文本表示
    toString() {
        return `${this.rank}${this.suit}`;
    }
    
    // 获取卡牌的图片名称
    getImageName() {
        return `${this.rank}${this.suit}`;
    }
    
    // 翻转卡牌
    flip() {
        this.faceUp = !this.faceUp;
        return this;
    }
    
    // 获取卡牌的数值（用于比较大小）
    getValue() {
        switch(this.rank) {
            case RANKS.ACE: return 14;
            case RANKS.KING: return 13;
            case RANKS.QUEEN: return 12;
            case RANKS.JACK: return 11;
            default: return parseInt(this.rank, 10);
        }
    }
}

// 扑克牌组类
class Deck {
    constructor() {
        this.cards = [];
        this.reset();
    }
    
    // 重置牌组（创建一副新牌）
    reset() {
        this.cards = [];
        for (const suit of Object.values(SUITS)) {
            for (const rank of Object.values(RANKS)) {
                this.cards.push(new Card(rank, suit));
            }
        }
        return this;
    }
    
    // 洗牌
    shuffle() {
        this.cards = shuffleArray(this.cards);
        return this;
    }
    
    // 发牌
    deal(count = 1) {
        if (this.cards.length < count) {
            console.warn('Not enough cards in the deck!');
            return [];
        }
        return this.cards.splice(0, count);
    }
    
    // 获取剩余牌数
    remaining() {
        return this.cards.length;
    }
}

// 手牌评估（简化版，仅判断高牌）
function evaluateHand(playerCards, communityCards) {
    const allCards = [...playerCards, ...communityCards];
    
    // 按照牌值从大到小排序
    allCards.sort((a, b) => b.getValue() - a.getValue());
    
    // 简化版本，仅返回最高的牌
    return {
        type: 'HIGH_CARD',
        value: allCards[0].getValue(),
        cards: allCards.slice(0, 5)
    };
} 