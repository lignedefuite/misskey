# 外观系统 · 阶段一产物

## 结构

- `styles/` 4 个外观包（形状/材质层）：abyss · voltage · glass · wasteland
- `themes/` 12 套预设配色（主题层），每个风格 3 套
- `preview-4-styles.png` 四种风格对比图
- `icon-*.png` 实例图标（已应用到 mk.iwashi.rip）

## 设计原则：style × theme 解耦

- **style 包**只写形状与材质：圆角、边框、阴影、模糊、字体排印、滚动条
- **theme** 只写颜色，全部通过 Misskey 主题 props 表达
- 因此任意 style 可以配任意 theme（例如"直角 + 米色"或"玻璃 + 锈红"都成立）

## 阶段一怎么试（仅影响你自己的账户）

1. **装主题**：设置 → 外观 → 主题 → 页面底部「安装主题」（/settings/theme/install）
   → 把 `themes/*.json5` 之一整段粘进去 → 安装 → 选中
2. **装外观包**：设置 → 外观 → 自定义 CSS → 把 `styles/*.css` 整段粘进去 → 保存
   （注意：安全模式下自定义 CSS 会被禁用）

推荐四组搭配：

| style 包 | 推荐主题 | 观感 |
|---|---|---|
| abyss.css | abyss-cyan / abyss-ember / abyss-mono | 深色霓虹玻璃 |
| voltage.css | voltage-lime / voltage-magenta / voltage-azure | 明亮暴烈、直角、硬边框偏移阴影 |
| glass.css | glass-mist / glass-rose / glass-sage | 极简液态玻璃、大圆角 |
| wasteland.css | waste-winter / waste-rust / waste-fallout | 核冬天/废土、噪点、低饱和 |

## 阶段一的局限（阶段二要解决的）

- 主题是**用户本地安装**的，别人看不到，也不会自动出现在列表里
- 自定义 CSS 同理，只作用于当前浏览器
- 圆角覆盖是全局 `!important` 级别的，少数圆形控件需要例外（包内已加头像例外规则）
- 缺少正式的切换界面（目前靠"粘 CSS"换 style）

## 阶段二（代码层，待做）

1. `Meta` 增加 `defaultUiStyle`，控制面板可选实例默认
2. 前端 `<html data-ui-style="abyss|voltage|glass|wasteland">`，由"实例默认 + 用户覆盖"决定
3. 4 个 style 包改成 SCSS 作用域块 `html[data-ui-style="x"] { ... }`
4. 12 套主题打包进前端 `frontend-shared/themes/`，所有人可直接选
5. 设置页加切换器；i18n 只改 ja-JP.yml（其他语言由 Crowdin 管理）
6. docker build + 部署
