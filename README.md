# VT助手官网

[在线官网](https://zzfzzxf.github.io/vt-assistant/) · [GitHub 仓库](https://github.com/zzfzzxf/vt-assistant)

产品展示官网，采用深石墨黑与冰川绿，包含三维芯片概念视觉、产品介绍、场景切换、使用指引、软件下载和常见问题。支持手机、浅深主题、键盘操作和减少动画偏好。

## 本地查看

直接打开 `offline/index.html`，保留其旁边的 `images` 和 `downloads` 文件夹。正式部署使用 `dist/`，3D 资源延后加载，让正文和下载入口优先显示。也可以启动本地预览：

```sh
pnpm install
pnpm build
pnpm preview --port 4173
```

浏览器访问 `http://127.0.0.1:4173/`。开发时运行 `pnpm dev`。

Node.js 版本需符合 Vite 7 要求（20.19+ 或 22.12+）；也可使用 npm 安装依赖及执行同名 scripts。

## 文件说明

- `src/main.jsx`：页面、导航、场景切换、指引弹窗、FAQ、下载交互。
- `src/ChipScene.jsx`：Three.js 芯片视觉；离屏时暂停绘制，支持静态降级。
- `src/styles.css`：主题、布局、动画、移动适配。
- `src/product.js`：下载文件路径、保存名称、大小及 SHA-256。
- `public/downloads/VT-Assistant-Mode2-Test.7z`：用户提供的软件包副本。
- `public/images/`：本地静态视觉资源，无第三方在线资源依赖。
- `dist/`：已构建的静态网站，部署时使用整个目录。
- `offline/`：无需启动服务器，双击 `index.html` 即可打开的离线预览版。
- `scripts/serve.mjs`：支持 gzip/Brotli 的本地静态预览服务。
- `scripts/verify.mjs`：浏览器交互、下载哈希及响应式验证。
- `reports/`：本地验证结果、截图与 Lighthouse 报告。

## 下载文件

网页入口只显示“下载软件”，浏览器保存名称为 `VT助手.7z`。原软件包未修改或运行。

原文件名称：`VT助手_模式2全新架构测试.7z`

大小：25,754,285 字节。

SHA-256：

```text
b448dde4802dd52c06d7a1caa42cc61db4dceaefc872234a232777822c9d3d9f
```

HTTP 模式下，页面检查响应、文件大小，并在安全上下文中校验 SHA-256 后交给浏览器保存；失败会显示重试提示。直接打开 HTML 时使用浏览器原生本地文件下载。

更换版本时，替换 `public/downloads/` 下的文件，更新 `src/product.js` 的 `url`、`filename`、`bytes` 和 `sha256`，重新构建。不要只替换压缩包而保留旧的校验值。

## 部署

将整个 `dist/` 上传至支持静态文件的服务器。下载路径必须与站点处于同一来源；支持部署在子目录。推荐启用 HTTPS 与文本 gzip/Brotli。`.7z` 使用 `application/x-7z-compressed`，可设置 `Content-Disposition: attachment`。

测试仅覆盖网站，不代表对软件功能、游戏性能或系统兼容性的测试。

### GitHub Pages

项目适合 GitHub Pages：全部功能在浏览器运行，页面使用相对资源路径，包含的下载文件约 24.6 MiB。仓库内的 `.github/workflows/pages.yml` 在 `main` 分支更新时自动构建并发布 `dist/`。

仓库的 Settings → Pages → Build and deployment 应选择 GitHub Actions。Actions 使用 Node.js 24 和 pnpm 11.19.0，执行 `pnpm install --frozen-lockfile` 与 `pnpm run build:pages`。构建检查会验证相对路径、文件体积、下载哈希及部署文件清单。

发布源码包含官网和明确指定的软件包。任务记录、本地报告、工具、凭据文件、离线交付包以及 `node_modules` 均不进入仓库。更新公开的软件包时，同步修改 `src/product.js` 中的文件大小和哈希。

## 验证结果

运行 `node scripts/verify.mjs`：17/17 项通过，包括 HTTP 下载和直接打开离线页后的真实下载；两者均核对完整文件哈希。截图及详细结果在 `reports/`。

运行 `node scripts/audit.mjs`：最终移动模拟 Lighthouse 性能 81、无障碍 100、最佳实践 82、SEO 100；FCP 3.0 秒、LCP 3.5 秒、TBT 230 毫秒、CLS 0。本机安全软件向 HTTP 页面额外注入脚本，报告包含这些非网站资源的加载与 HTTP 影响，不能作为正式服务器的实测成绩。

这两项浏览器脚本使用 Playwright 和无头 Edge，未使用 Windows 桌面自动化。若在其他机器运行，先安装 Playwright，并可用 `BROWSER_PATH` 指定浏览器、`SITE_URL` 指定预览网址。

`VT助手官网.zip` 是完整交付包，包含正式页面、可双击打开的本地预览页、图片和软件包。开发源代码保留于本目录。

## 资源

- 游戏桌面照片：Unsplash，图片 ID `photo-1593305841991-05c297ba4575`，本地副本用于页面视觉。
- 芯片视觉：代码生成的原创三维概念场景，不代表特定处理器型号。
- 图标：Phosphor Icons，MIT。
- 拉丁字体：Geist，SIL Open Font License；中文使用系统字体。

构建输出和验证报告已列入 `.gitignore`。`public/downloads/VT-Assistant-Mode2-Test.7z` 是唯一明确加入版本控制的软件包，用于网页中的公开下载。
