/**
 * 工具函数集合
 */

// 音频管理
const AudioManager = {
    sounds: {},
    
    // 加载音频文件
    load: function(name, path) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.src = path;
            audio.addEventListener('canplaythrough', () => {
                this.sounds[name] = audio;
                resolve(audio);
            }, { once: true });
            audio.addEventListener('error', (err) => {
                console.error(`Failed to load audio: ${path}`, err);
                reject(err);
            });
        });
    },
    
    // 播放音频
    play: function(name) {
        if (this.sounds[name]) {
            // 克隆音频对象以允许重叠播放
            if (name === 'deal') {
                const clone = this.sounds[name].cloneNode();
                clone.volume = 0.5;
                clone.play();
            } else {
                this.sounds[name].currentTime = 0;
                this.sounds[name].play().catch(err => console.warn('Audio play error:', err));
            }
        }
    },
    
    // 循环播放背景音乐
    playBackground: function(name) {
        if (this.sounds[name]) {
            this.sounds[name].loop = true;
            this.sounds[name].volume = 0.3;
            this.sounds[name].play().catch(err => console.warn('Background audio play error:', err));
        }
    }
};

// 图片加载器
const ImageLoader = {
    images: {},
    
    // 加载单个图片
    loadImage: function(name, path) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = path;
            img.onload = () => {
                this.images[name] = img;
                resolve(img);
            };
            img.onerror = (err) => {
                console.error(`Failed to load image: ${path}`, err);
                reject(err);
            };
        });
    },
    
    // 批量加载图片
    loadImages: async function(imageList) {
        const promises = [];
        for (const [name, path] of Object.entries(imageList)) {
            promises.push(this.loadImage(name, path));
        }
        return Promise.all(promises);
    },
    
    // 获取已加载的图片
    getImage: function(name) {
        return this.images[name];
    }
};

// 洗牌算法 (Fisher-Yates)
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// 检测设备方向
function isLandscape() {
    return window.innerWidth > window.innerHeight;
}

// 简单的事件发布/订阅系统
const EventBus = {
    events: {},
    
    on: function(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(callback);
    },
    
    off: function(eventName, callback) {
        if (this.events[eventName]) {
            this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
        }
    },
    
    emit: function(eventName, data) {
        if (this.events[eventName]) {
            this.events[eventName].forEach(callback => callback(data));
        }
    }
}; 