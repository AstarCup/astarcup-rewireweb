## Style Rules

STYLE: Paper Craft
TYPE: Handmade paper art interface

## 必须遵守

- 背景使用纸白色 bg-[#fdf6ee] 或柔和暖白
- 卡片使用纸张阴影 shadow-[4px_4px_0px_rgba(0,0,0,0.08)] 模拟凸起效果
- 按钮使用偏移阴影 shadow-[3px_3px_0px_rgba(0,0,0,0.1)] 模拟纸片凸起
- 使用圆润但不完美的圆角 rounded-xl 搭配微旋转 rotate-[1deg]
- 色块使用明快的纸艺色 bg-[#e85d75]、bg-[#5cb8a5]、bg-[#f5c040]
- 文字使用深色 text-[#2d2d2d] 搭配手写感字体或圆润无衬线字体
- 层叠效果使用多个 div 带 absolute 定位和不同阴影深度
- 悬停时微微抬起 hover:-translate-y-1 hover:shadow-[5px_5px_0px_rgba(0,0,0,0.12)]
- 多层卡片在 hover 时让底层纸片向不同角度散开（Layer Separation）
- 按钮和卡片位移时，阴影偏移距离同步增大，强调纸片离开桌面的厚度
- 输入框 focus 使用更深 inset 阴影模拟纸板切口（Cutout Depth）

## 绝对禁止

- 禁止使用深色/黑色背景
- 禁止使用发光效果或霓虹阴影
- 禁止使用金属质感或玻璃拟态
- 禁止使用过于精确的直角边缘（看起来太数字化）
- 禁止使用高饱和度的荧光色
- 禁止使用渐变发光效果
- 禁止使用弹簧回弹曲线（纸片轻但不橡胶）
- 禁止层叠纸片在 hover 时完全同向运动（会丢失手工剥离感）

COLOR RULES:
- Craft Red: #e85d75 (primary)
- Paper White: #fdf6ee (background)
- Paper Teal: #5cb8a5
- Paper Yellow: #f5c040
- Paper Blue: #6b7fb5
- Text: #2d2d2d

SPECIAL EFFECTS:
- Multi-layer paper stacking with rotation offsets
- Inset shadows for cut-out/embossed feel
- Active press-down: active:translate-y-0.5
- Paper texture overlay for authenticity

## Animation & Interaction Rules

- Layer Separation: 多层纸片 hover 时需向不同方向轻微散开，并放大层间阴影偏移。
- Crisp Cutouts: input focus 或 active 反馈可加深 inset 阴影，模拟纸板切口深度。
- Stiff Paper Feel: 交互用 duration-200/300 + ease-out，避免 spring 弹性。
- Offset Lift: 元素位移时阴影偏移应同步增加，保持纸片离面物理一致性。

---

# Paper Craft (纸艺手作) Design System

> 纸艺与剪纸风格，层叠纸张效果、柔和阴影暗示深度、手作质感边缘。适合儿童品牌、教育产品、创意工作室。

## 核心理念

Paper Craft（纸艺手作）的设计灵感来自剪纸艺术、折纸和手工拼贴。通过层叠的纸张效果、柔和的投影和不规则的手作边缘，创造出温暖、有触感的视觉体验。

核心理念：
- 纸张层叠：通过多层阴影和微妙的偏移创造出真实的纸张堆叠感
- 手作质感：边缘略带不规则感，避免过于数字化的精确
- 柔和色彩：使用纸张般温暖的底色搭配明快但不刺眼的彩色纸片
- 深度暗示：通过阴影方向和强度传达前后层次关系

这个风格刻意回避数字世界的冷硬精确感，转而拥抱手工制作的温度。每一个 UI 元素都应该看起来像是用彩色纸张裁剪、折叠和粘贴而成的——按钮是一张凸起的纸片，卡片是堆叠的纸层，输入框是在纸上裁切出的凹槽。

适合场景：儿童教育应用、手工创意商店、幼儿园网站、创意工作室作品集、DIY 教程平台。

---

## Token 字典（精确 Class 映射）

### 边框
```
宽度: border-2
颜色: border-[#e0d8cc]
圆角: rounded-xl
```

### 阴影
```
小: shadow-[2px_2px_0px_rgba(0,0,0,0.06)]
中: shadow-[4px_4px_0px_rgba(0,0,0,0.08)]
大: shadow-[6px_6px_0px_rgba(0,0,0,0.1)]
悬停: hover:shadow-[5px_5px_0px_rgba(0,0,0,0.12)]
聚焦: focus:shadow-[0_0_0_3px_rgba(232,93,117,0.15)]
```

### 交互效果
```
悬停位移: （无）
悬停缩放: hover:-translate-y-0.5
悬停透明度: （无）
过渡动画: transition-all duration-200
按下状态: active:translate-y-0.5 active:shadow-[1px_1px_0px_rgba(0,0,0,0.06)]
```

### 字体
```
标题: font-bold
正文: font-sans
等宽: font-mono
```

### 字号
```
Hero: text-4xl md:text-6xl lg:text-7xl
H1: text-3xl md:text-5xl
H2: text-2xl md:text-3xl
H3: text-xl md:text-2xl
正文: text-sm md:text-base
小字: text-xs
```

### 间距
```
Section: py-12 md:py-20
容器: px-4 md:px-8
卡片: p-6
小间距: gap-4
中间距: gap-6
大间距: gap-8
```

### 颜色角色
```
背景主色: bg-[#fdf6ee]
背景辅色: bg-white
背景强调色: bg-[#e85d75], bg-[#5cb8a5], bg-[#f5c040], bg-[#6b7fb5]
正文主色: text-[#2d2d2d]
正文辅色: text-[#666666]
正文弱化色: text-[#b0a898]
按钮主色: bg-[#e85d75] text-white
按钮辅色: bg-white text-[#2d2d2d] border-2 border-[#2d2d2d]
```

---

## [FORBIDDEN] 绝对禁止

以下 class 在本风格中**绝对禁止使用**，生成时必须检查并避免：

### 禁止的 Class
- `bg-black`
- `bg-gray-900`
- `bg-gray-950`
- `shadow-[0_0_`
- `text-cyan-`
- `text-fuchsia-`
- `bg-cyan-`
- `bg-fuchsia-`

### 禁止的模式
- 匹配 `^bg-(?:black|gray-[89])`
- 匹配 `^shadow-\[0_0_.*rgba`
- 匹配 `^text-(?:cyan|fuchsia)-`
- 匹配 `^bg-(?:cyan|fuchsia)-`

### 禁止原因
- `bg-black`: Paper Craft uses warm light backgrounds, never dark
- `shadow-[0_0_`: Use offset paper shadows (shadow-[4px_4px_...]), not glows
- `text-cyan-`: Use craft colors (#e85d75, #5cb8a5, #f5c040) not neon

> WARNING: 如果你的代码中包含以上任何 class，必须立即替换。

---

## [REQUIRED] 必须包含

### 按钮必须包含
```
px-6 py-3
font-bold
rounded-xl
shadow-[3px_3px_0px_rgba(0,0,0,0.1)]
transition-all duration-200
```

### 卡片必须包含
```
bg-white
rounded-2xl
shadow-[4px_4px_0px_rgba(0,0,0,0.08)]
```

### 输入框必须包含
```
bg-white
border-2 border-[#e0d8cc]
rounded-xl
text-[#2d2d2d]
focus:border-[#e85d75]
focus:outline-none
```

---

## [COMPARE] Paper Craft 错误 vs 正确对比

以下错误示例只代表“未经过当前风格适配的通用默认值”，不要把错误示例当成视觉建议。

### 按钮

[WRONG] **错误示例**（通用组件库默认样式，不要直接复制）：
```html
<button class="{GENERIC_LIBRARY_BUTTON_DEFAULT}">
  点击我
</button>
```

[CORRECT] **正确示例**（使用当前风格的 token）：
```html
<button class="px-6 py-3 font-bold rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,0.1)] transition-all duration-200 bg-[#e85d75] text-white">
  点击我
</button>
```

### 卡片

[WRONG] **错误示例**（未经当前风格适配的通用卡片）：
```html
<div class="{GENERIC_LIBRARY_CARD_DEFAULT}">
  <h3>{TITLE}</h3>
</div>
```

[CORRECT] **正确示例**（使用当前风格的 card token）：
```html
<div class="bg-white rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,0.08)] p-6">
  <h3 class="font-bold text-xl md:text-2xl">{TITLE}</h3>
</div>
```

### 输入框

[WRONG] **错误示例**（未经当前风格适配的通用输入框）：
```html
<input class="{GENERIC_LIBRARY_INPUT_DEFAULT}" />
```

[CORRECT] **正确示例**（使用当前风格的 input token）：
```html
<input class="bg-white border-2 border-[#e0d8cc] rounded-xl text-[#2d2d2d] focus:border-[#e85d75] focus:outline-none" placeholder="{PLACEHOLDER}" />
```

---

## [TEMPLATES] Paper Craft 页面骨架模板

以下骨架只使用当前风格的 token。替换 `{PLACEHOLDER}` 时，不要移除或替换这些 token：

### 导航栏骨架
```html
<nav class="bg-[#fdf6ee] text-[#2d2d2d] border-2 border-[#e0d8cc] px-4 md:px-8">
  <div class="flex items-center justify-between max-w-6xl mx-auto gap-6">
    <a href="/" class="font-bold text-xl md:text-2xl">
      {LOGO_TEXT}
    </a>
    <div class="flex gap-6 font-sans text-xs">
      {NAV_LINKS}
    </div>
  </div>
</nav>
```

### Hero 区块骨架
```html
<section class="bg-[#e85d75] text-[#2d2d2d] py-12 md:py-20 px-4 md:px-8">
  <div class="max-w-4xl mx-auto">
    <h1 class="font-bold text-4xl md:text-6xl lg:text-7xl">
      {HEADLINE}
    </h1>
    <p class="font-sans text-sm md:text-base max-w-xl">
      {SUBHEADLINE}
    </p>
    <button class="px-6 py-3 font-bold rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,0.1)] transition-all duration-200 bg-[#e85d75] text-white">
      {CTA_TEXT}
    </button>
  </div>
</section>
```

### 卡片网格骨架
```html
<section class="bg-[#fdf6ee] text-[#2d2d2d] py-12 md:py-20 px-4 md:px-8">
  <div class="max-w-6xl mx-auto">
    <h2 class="font-bold text-2xl md:text-3xl">{SECTION_TITLE}</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- Card template - repeat for each card -->
      <div class="bg-white rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,0.08)] p-6">
        <h3 class="font-bold text-xl md:text-2xl">{CARD_TITLE}</h3>
        <p class="font-sans text-sm md:text-base text-[#b0a898]">{CARD_DESCRIPTION}</p>
      </div>
    </div>
  </div>
</section>
```

### 表单输入骨架
```html
<input class="bg-white border-2 border-[#e0d8cc] rounded-xl text-[#2d2d2d] focus:border-[#e85d75] focus:outline-none" placeholder="{PLACEHOLDER}" />
```

### 页脚骨架
```html
<footer class="bg-white text-[#666666] py-12 md:py-20 px-4 md:px-8">
  <div class="max-w-6xl mx-auto">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div>
        <span class="font-bold text-xl md:text-2xl">{LOGO_TEXT}</span>
        <p class="font-sans text-xs">{TAGLINE}</p>
      </div>
      <div>
        <h4 class="font-bold text-xl md:text-2xl">{COLUMN_TITLE}</h4>
        <ul class="font-sans text-xs">
          {FOOTER_LINKS}
        </ul>
      </div>
    </div>
  </div>
</footer>
```

---

## [CHECKLIST] Paper Craft 生成后自检清单

**输出代码前，逐项验证当前风格的 token 和规则。如有违反，先修正再交付：**

### Token 检查
- [ ] 按钮包含： `px-6 py-3 font-bold rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,0.1)] transition-all duration-200`
- [ ] 卡片包含： `bg-white rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,0.08)]`
- [ ] 输入框包含： `bg-white border-2 border-[#e0d8cc] rounded-xl text-[#2d2d2d] focus:border-[#e85d75] focus:outline-none`

### 禁止项检查
- [ ] 没有使用 `bg-black`
- [ ] 没有使用 `bg-gray-900`
- [ ] 没有使用 `bg-gray-950`
- [ ] 没有使用 `shadow-[0_0_`
- [ ] 没有使用 `text-cyan-`
- [ ] 没有使用 `text-fuchsia-`
- [ ] 没有使用 `bg-cyan-`
- [ ] 没有使用 `bg-fuchsia-`

### 风格规则检查
- [ ] 背景使用纸白色 bg-[#fdf6ee] 或柔和暖白
- [ ] 卡片使用纸张阴影 shadow-[4px_4px_0px_rgba(0,0,0,0.08)] 模拟凸起效果
- [ ] 按钮使用偏移阴影 shadow-[3px_3px_0px_rgba(0,0,0,0.1)] 模拟纸片凸起
- [ ] 使用圆润但不完美的圆角 rounded-xl 搭配微旋转 rotate-[1deg]
- [ ] 色块使用明快的纸艺色 bg-[#e85d75]、bg-[#5cb8a5]、bg-[#f5c040]

### 风格漂移检查
- [ ] 没有违反：禁止使用深色/黑色背景
- [ ] 没有违反：禁止使用发光效果或霓虹阴影
- [ ] 没有违反：禁止使用金属质感或玻璃拟态
- [ ] 没有违反：禁止使用过于精确的直角边缘（看起来太数字化）
- [ ] 没有违反：禁止使用高饱和度的荧光色

### 通用交付检查
- [ ] 响应式布局在手机、平板和桌面下稳定，没有横向溢出
- [ ] 所有交互元素有清晰焦点、可访问名称和 reduced-motion 方案
- [ ] 文本对比度达到 WCAG AA，且没有用颜色单独传递状态
- [ ] 结果仍然能够一眼识别为 Paper Craft

---

## [EXAMPLES] 示例 Prompt

### 1. 儿童教育平台

纸艺风格的儿童学习界面

```
Create a kids education landing page using Paper Craft style:
- Warm paper-white background
- Colorful paper-layered cards for subjects
- Playful buttons with paper-shadow and slight rotation
- Badge/label elements as paper cutouts
- Layered paper decorative borders
- Bright but soft craft colors
```

### 2. SaaS 着陆页

生成 纸艺手作风格的 SaaS 产品着陆页

```
Create a SaaS landing page using Paper Craft style with hero section, feature grid, testimonials, pricing table, and footer.
```

### 3. 作品集展示

生成 纸艺手作风格的作品集页面

```
Create a portfolio showcase page using Paper Craft style with project grid, about section, contact form, and consistent visual language.
```

## 绝对禁止（匹配即拒绝）

以下模式一旦出现，视为风格违规——不找借口，直接重写。

- 使用深色/黑色背景
- 使用发光效果或霓虹阴影
- 使用金属质感或玻璃拟态
- 使用过于精确的直角边缘（看起来太数字化）
- 使用高饱和度的荧光色
- 使用渐变发光效果
- 使用弹簧回弹曲线（纸片轻但不橡胶）
- 层叠纸片在 hover 时完全同向运动（会丢失手工剥离感）

## 自检清单（交付前逐条确认）

如果任何一条不通过，说明风格漂移了——修改后再交付。

- [ ] 没有紫色到蓝色的渐变
- [ ] 没有使用 Inter / Roboto / Geist 等过度使用的字体
- [ ] 没有嵌套卡片（卡片里面套卡片）
- [ ] 没有在彩色背景上放灰色文字
- [ ] 正文对比度满足 WCAG AA（≥4.5:1）
- [ ] 没有 bounce / elastic 缓动曲线
- [ ] 动效有 prefers-reduced-motion 备选方案
- [ ] 正文行宽不超过 65-75 个字符
- [ ] 没有单侧粗边框装饰（border-left/right accent stripe）
- [ ] 没有渐变文字（background-clip: text）
- [ ] 没有把玻璃态（glassmorphism）当作默认风格
- [ ] 没有 tiny uppercase tracked eyebrow 放在每个 section 标题上面
- [ ] 禁止使用深色/黑色背景
- [ ] 禁止使用发光效果或霓虹阴影
- [ ] 禁止使用金属质感或玻璃拟态
- [ ] 禁止使用过于精确的直角边缘（看起来太数字化）
- [ ] 禁止使用高饱和度的荧光色
