# Dev Panel

終端機 TUI 工具，統一管理多個 Nuxt dev server。

## 安裝

```bash
npm install
npm run build
npm link
```

## 使用

```bash
# 啟動 TUI
dev-panel

# 初始化設定檔
dev-panel init

# 新增專案
dev-panel add /path/to/project

# 移除專案
dev-panel remove <id>

# 列出所有專案
dev-panel list

# 編輯設定檔
dev-panel config
```

## 快捷鍵

### Dashboard

| 按鍵 | 功能 |
|------|------|
| `j` / `↓` | 下移 |
| `k` / `↑` | 上移 |
| `1-9` | 選取第 N 個專案 |
| `s` / `Enter` | 啟動 |
| `x` | 停止 |
| `r` | 重啟 |
| `a` | 啟動全部 |
| `X` | 停止全部 |
| `l` | 查看 Log |
| `o` | 開啟網頁 |
| `O` | 開啟全部網頁 |
| `?` | 說明 |
| `q` | 退出 |

### Log 檢視

| 按鍵 | 功能 |
|------|------|
| `Esc` | 返回 |
| `Tab` | 下一個專案 |
| `Shift+Tab` | 上一個專案 |
| `c` | 清除 Log |
| `p` | 暫停/恢復 |

## 設定檔

位於 `~/.dev-panel/config.json`
