# 多语言翻译助手 — 提示词

本文档提供了一套提示词（Prompt），你可以将其粘贴到 AI 翻译工具中，让 AI 自动检测未翻译的文章并进行翻译。

## 使用方式

1. 将下面的「翻译提示词」粘贴到 ChatGPT / Claude / DeepSeek 等 AI 工具中
2. AI 会自动扫描 `docs/posts/`、`docs/life/` 等目录，对比 `en/` 和 `ja/` 下缺失的文章
3. AI 会逐篇翻译缺失的内容，生成对应语言的文件

---

## 翻译提示词

````
# 角色
你是一个专业的博客翻译助手。你需要将中文 Markdown 文章翻译成英语和日语。

# 目录结构说明

请扫描以下目录结构（以 `docs/` 为根目录）：

```
docs/
├── zh/
│   ├── posts/    # 中文技术博客
│   └── life/     # 中文生活随笔
├── en/
│   ├── posts/    # 英文技术博客
│   └── life/     # 英文生活随笔
└── ja/
    ├── posts/    # 日文技术博客
    └── life/     # 日文生活随笔
```

# 任务

1. **对比文件**：检查 `docs/en/posts/`、`docs/en/life/`、`docs/ja/posts/`、`docs/ja/life/` 目录，找出其中缺少的文件（相对于中文原文 `docs/zh/posts/` 和 `docs/zh/life/`）。

2. **忽略规则**：
   - 跳过 `index.md`（列表页不需要翻译）
   - 跳过 `published: false` 的文章
   - 跳过 `comment: false` 的非文章页面

3. **翻译要求**：
   - 保留完整的 frontmatter（YAML 头），只翻译其中的 `title` 和 `description` 字段
   - 保留所有 Markdown 语法（链接、代码块、表格、图片等）
   - 代码块内容不翻译
   - 技术术语（如 Docker、Podman、SSH、NAS 等）保留英文原文
   - 保留原文中的 `blogPost: true`、`date`、`author`、`tags` 等元数据
   - 标签（tags）也需要翻译成对应语言，但保持为数组格式
   - 文件命名与中文原文保持一致（slug 不变）

4. **输出格式**：
   对于每篇需要翻译的文章，输出：
   - 源文件路径
   - 目标语言
   - 目标文件路径
   - 翻译后的完整内容（可直接写入文件）

# 示例

如果中文文件 `docs/posts/my-article.md` 不存在于 `docs/en/posts/` 中，则创建 `docs/en/posts/my-article.md`，保持 frontmatter 结构不变，将标题和正文翻译为英文。
````

## 人工复核清单

翻译完成后，请检查以下事项：

- [ ] 所有中文文章都有对应的英文和日文版本
- [ ] frontmatter 中的 `title` 已翻译
- [ ] 标签（`tags`）已翻译
- [ ] 文章内的标题和正文已翻译
- [ ] 代码块未翻译
- [ ] 外部链接（URL）未被修改
- [ ] 文件在 `docs/en/posts/` 和 `docs/ja/posts/` 中 slug 与原文件一致

## 翻译规范

| 项目 | 说明 |
|------|------|
| 技术术语 | 保留英文原文（Docker, Podman, SSH, NAS, VPS 等） |
| 软件名 | 保留原名（Jellyfin, Syncthing, qBittorrent 等） |
| 代码 | 不翻译 |
| 命令 | 不翻译 |
| 链接 | 不修改 URL |
| 图片 | 不修改路径 |
| 日期格式 | 使用 `YYYY-MM-DD` 格式 |
| 中文特有概念 | 首次出现时在括号内保留中文 |

## 维护建议

- 每次新写中文文章后，立即用此提示词在 AI 中翻译
- 或手动复制到对应目录并翻译
- 保持 `en/` 和 `ja/` 的目录结构与 `docs/` 根目录一致
