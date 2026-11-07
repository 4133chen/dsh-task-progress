# 任务进度条 · Task Progress Bars

给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web UI 的会话任务清单换上**每个任务一条进度条**，并在任务完成时提供**可选**提醒。
A DeepSeek Harness Web UI plugin that renders a progress bar for every session task and offers optional completion reminders.

![license](https://img.shields.io/badge/license-MIT-blue)

## 功能 / Features

- **每个任务一条进度条**：输入框上方的任务面板中，每个任务显示状态点、任务名、迷你进度条和百分比。
  - 待处理 `pending` → `0%`；进行中 `in_progress` → `50%`（呼吸动画）；已完成 `completed` → `100%`（成功色 + 删除线）。
- **整体进度**：标题行常驻整体进度条，显示「已完成 x/y · 百分比」；总进度按加权估算 `(完成数 + 0.5 × 进行中数) / 总数`，是"大概进度"。
- **可选完成提醒**：面板右上角铃铛按钮，默认关闭、点击开启，偏好保存在浏览器本地。
  - 任务变为已完成时弹应用内提醒；全部完成时提示「全部任务完成 🎉」并附会话名。
  - 跨会话监控：切换到别的会话时，原会话任务完成也会提醒；面板自身另有兜底检测，5 秒内去重。
  - 系统通知可用时额外发送；应用内提醒始终兜底（Windows 上系统通知依赖应用通知设置）。
- **可折叠**：点击标题行展开/收起任务列表；折叠状态与提醒开关都会被记住。
- **跟随主题**：只使用 Harness 的 `--dsw-alias-*` 主题 token，自动适配明暗主题。
- **8 种语言**：中文、English、日本語、Español、Français、Deutsch、Русский、Português。

## 环境要求 / Requirements

- DeepSeek Harness（Web UI / Desktop），版本 `0.2.2-rc.1` 附近。
- 当前 Agent 预设需要挂载 `@deepseek-ai/dsh-tool-todo`（`standand` 预设默认已挂载，`todos` 投影即数据源）。
- 无构建步骤：`client.js` 是 Harness 客户端可直接加载的普通 JS 插件包。

## 安装 / Installation

### 方式一：让 Harness 里的智能体安装（推荐）

```bash
git clone https://github.com/4133chen/dsh-task-progress.git
```

然后在任一 DSH 会话中把该目录告诉智能体，例如：

> 用 plugin_manager 把 `dsh-task-progress` 目录安装为本地插件。

智能体会调用 `plugin_manager install_bundle`（绝对路径指向克隆下来的目录）：安装包、写入 profile 的 bundle 选择并热加载，通常无需重启。安装结束后输入框上方即出现任务进度面板。

### 方式二：手动加入 profile

1. 在 `~/.dsh/profiles/<你的profile>/package.json` 中把插件加入依赖与 bundle 列表：

   ```json
   {
     "dependencies": { "@local/task-progress": "link:/path/to/dsh-task-progress" },
     "dsh": { "profile": { "bundles": ["...", "@local/task-progress"] } }
   }
   ```
2. 在 profile 目录执行 `pnpm install`（或直接使用 Harness 的插件管理界面安装本地包）。
3. 重启 Harness（或等待 HMR）后生效。

### 卸载 / Uninstall

在 设置 → 插件 中禁用或移除本插件即可；内置任务面板会自动恢复。

## 使用 / Usage

1. 让智能体维护任务清单（它会调用 `todo_write`），面板即出现在输入框上方。
2. 每个任务的进度条按状态估算；任务变为「进行中」时进度到一半，完成后满格。
3. 点右上角 🔔 开启完成提醒；再点一次关闭。
4. 全部完成后面板显示 100%；下一回合开始时旧清单会随 `todo_write` 生命周期清空。

## 实现 / How it works

| 文件 | 作用 |
|---|---|
| `index.js` | Host 半边：空插件，仅作为 Loader 行让 `dsh.client` 声明加入浏览器插件表 |
| `client.js` | 浏览器半边：读取会话 `todos` 投影、渲染进度面板、注册提醒 toast 栈 |
| `cordis.patch.yml` | bundle 补丁：插入 `task-progress` 行 |
| `locale/*.json` | 插件列表展示用标题/描述（8 语言） |
| `icon.svg` | 原创插件图标 |

- 面板复用 `conversation.input.dock` 中内置任务面板的 cell（`id: "todo"`，`priority: -100` 更低者胜），因此不会出现两份任务列表；禁用本插件后内置面板自动恢复。
- 提醒 toast 注册在 frame-wide 的 `shell.overlay` 槽位（`id: "task-progress.toasts"`），点击穿透层上自行接管指针事件。
- 完成检测同时覆盖：当前面板（`useProjection("todos")`）与跨会话监控（`ctx.sessions.list` 的 `projectionsBySession`），并用 5 秒去重避免重复提醒。

## 本地化 / Localization

界面文案与插件列表标题/描述提供中文、English、日本語、Español、Français、Deutsch、Русский、Português 八种语言；随 Harness 语言设置切换。

## 已知限制 / Limitations

- 数据源是会话任务清单（`todo_write` 维护的 `todos` 投影），不是 Agent Teams 的共享任务板。
- "进度"是按任务状态估算的大概值，不是按耗时/子任务的精确百分比。
- 系统通知在 Windows 上是否弹出取决于系统通知设置与应用标识；应用内提醒不依赖它。
- 本插件替换了内置任务面板（同 cell 覆盖），如不希望替换可把 `client.js` 里的 `id` 改成自己的值并调整样式后作为附加面板使用。

## 开发 / Development

- 无打包步骤：修改 `client.js` 后由 Harness 客户端 HMR 自动替换插件（该 profile 需启用 `client-hmr`）。
- 自检脚本：`node --check client.js`；仓库不含构建产物。
- License: [MIT](LICENSE)

## 许可 / License

[MIT](LICENSE) © 2026 4133chen
