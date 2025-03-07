# H5 德州扑克游戏

这是一个基于 HTML5 Canvas 的简化版德州扑克游戏，专为手机端设计。

## 功能特点

- 单人模式（玩家对 AI）
- 实现德州扑克基本规则：发牌、回合制、投注
- 响应式布局，支持横屏和竖屏
- 触摸和键盘操作支持

## 如何运行

1. 克隆或下载本仓库
2. 使用 HTTP 服务器提供文件（如 Python 的 `http.server`）:
   ```
   python -m http.server
   ```
3. 在浏览器中访问 `http://localhost:8000`

或者直接在支持的 IDE 中打开 `index.html` 文件。

## 游戏控制

- **弃牌**：放弃当前手牌，退出本轮游戏
- **跟注/看牌**：跟随当前最高下注或不加注继续游戏
- **加注**：增加当前下注金额
- **全押**：押上所有筹码

## 键盘快捷键

- `F` 键：弃牌
- `C` 键：跟注/看牌
- `R` 键：加注
- `A` 键：全押

## 项目结构

```
├── index.html          # 主 HTML 文件
├── css/
│   └── style.css       # 样式文件
├── js/
│   ├── utils.js        # 工具函数
│   ├── card.js         # 扑克牌类
│   ├── player.js       # 玩家类
│   ├── game.js         # 游戏逻辑
│   ├── ui.js           # 游戏界面渲染
│   └── main.js         # 主入口文件
└── assets/
    ├── cards/          # 扑克牌图片
    └── sounds/         # 音效文件
```

## 技术栈

- HTML5 Canvas
- 原生 JavaScript (ES6+)
- CSS3

## 注意事项

- 游戏使用简化的手牌评估逻辑，仅判断高牌
- AI 使用简单的随机策略
- 如果图片资源加载失败，会使用文本替代