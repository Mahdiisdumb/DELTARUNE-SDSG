# Project Vinetrap 本地复刻

## 必读
Extract local-assets.7z to \public\local-assets
解压 local-assets.7z 到 \public\local-assets

https://drive.google.com/file/d/1hoVlSHHxQgTftkerDY2BXxpUfLHgzaqX/view?usp=sharing

## 运行

需要 Node.js `>=22.13.0`。

```powershell
npm install
npm run dev
```

然后访问 `http://localhost:3000/`。

生产构建与完整性检查：

```powershell
npm test
```

## 本地结构

- `public/orchard.html`：原站入口
- `public/play/`：章节页面和加载器
- `public/local-assets/`：本地游戏资源，约 1.1 GB
- `public/shared/local-gate.js`：仅限本机的正版验证替代层
- `app/keys/`：将原站资源清单接口映射到本地文件


## 中文汉化

网页资源已使用好人汉化组 `DeltaruneChinese` 的 `260723` 源码重建。中文字体、文本、贴图、代码和视频均已写入 Web 资源。