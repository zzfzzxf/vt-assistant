import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, ArrowRight, ArrowDown, DownloadSimple, Cpu, GameController, Lightning, Crosshair, CaretDown, Check, Sun, Moon, List, X, Cube, Monitor, CheckCircle, CircleNotch } from '@phosphor-icons/react';
import '@fontsource/geist/latin-400.css';
import '@fontsource/geist/latin-500.css';
import '@fontsource/geist/latin-600.css';
import '@fontsource/geist/latin-700.css';
import { product } from './product.js';
import './styles.css';

const ChipScene = lazy(() => import('./ChipScene.jsx'));
function HeroVisual({ theme }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setReady(true), 350); return () => clearTimeout(timer); }, []);
  const preview = <div className="chip-loading"><img src="./images/chip-fallback.webp" alt="VT 芯片概念视觉" width="677" height="550" fetchPriority="high" /></div>;
  return <div className="hero-visual">{ready ? <Suspense fallback={preview}><ChipScene theme={theme} /></Suspense> : preview}<span className="visual-caption">VT VIRTUALIZATION TECHNOLOGY</span></div>;
}

const navItems = [['产品优势', 'features'], ['核心技术', 'technology'], ['使用指引', 'guide']];
const experiences = [
  { label: '竞技时刻', title: '关键一刻，专注你的操作。', copy: '从瞄准到出手，让注意力回到游戏本身。VT助手，以更出色的游戏表现为目标。', icon: Crosshair },
  { label: '沉浸探索', title: '走进世界，享受每次探索。', copy: '穿越辽阔地图，发现下一处风景。让技术在幕后，让体验成为主角。', icon: Cube },
  { label: '日常开黑', title: '和队友一起，进入状态。', copy: '无论是默契配合，还是轻松一局，都值得拥有从容的游戏体验。', icon: GameController },
];
const questions = [
  ['VT助手是什么？', 'VT助手是一款面向游戏玩家的软件，以 VT 虚拟化技术为核心，致力于带来更出色的游戏性能与体验。'],
  ['什么是 VT 技术？', 'VT 是硬件虚拟化技术，让处理器支持更灵活的运行环境。能否使用相关功能，取决于处理器、主板固件和系统配置；VT 本身不等于固定的帧率提升。'],
  ['下载后如何开始使用？', '点击“下载软件”，保存并完整解压压缩包。请先阅读包内说明，再按照说明检查环境并启动软件；不要直接在压缩包内运行。'],
  ['怎样确认电脑已开启虚拟化？', '在 Windows 中打开任务管理器，进入“性能 → CPU”，查看“虚拟化”一项。若显示未启用，可参考电脑或主板厂商的文档，了解 BIOS / UEFI 中的虚拟化设置。'],
  ['游戏性能会提升多少？', '实际表现取决于硬件、系统环境、游戏以及具体配置。建议在相同游戏场景和画质设置下比较使用前后的体验，以实际测试为准。'],
];

function Brand({ footer = false }) {
  return <a className={`brand ${footer ? 'brand-footer' : ''}`} href="#home"><span className="brand-mark" aria-hidden="true">V<span>T</span></span><span>VT<span className="brand-cn">助手</span></span></a>;
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('vt-theme') || 'dark'; } catch { return 'dark'; } });
  const [activeTab, setActiveTab] = useState(0);
  const [download, setDownload] = useState({ state: 'idle', percent: 0, message: '' });
  const [guideOpen, setGuideOpen] = useState(false);
  const controller = useRef(null);
  const dialog = useRef(null);
  const guideTrigger = useRef(null);
  const mobileMenu = useRef(null);
  const menuTrigger = useRef(null);
  const current = experiences[activeTab];

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#101311' : '#edf1ed';
    try { localStorage.setItem('vt-theme', theme); } catch { /* Private browsing may disable storage. */ }
  }, [theme]);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }), { threshold: 0.12 });
    document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (guideOpen) dialog.current?.showModal();
    else if (dialog.current?.open) dialog.current.close();
  }, [guideOpen]);
  useEffect(() => {
    if (!menuOpen) return;
    mobileMenu.current?.querySelector('a')?.focus();
    const onKey = e => { if (e.key === 'Escape') { setMenuOpen(false); menuTrigger.current?.focus(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const startDownload = async () => {
    if (controller.current) return;
    if (location.protocol === 'file:') {
      const link = document.createElement('a'); link.href = product.download.url; link.download = product.download.filename;
      document.body.append(link); link.click(); link.remove();
      setDownload({ state: 'done', percent: 100, message: '已发起下载。请查看浏览器下载列表。' });
      return;
    }
    controller.current = new AbortController();
    setDownload({ state: 'loading', percent: 0, message: '正在获取软件…' });
    try {
      const response = await fetch(product.download.url, { signal: controller.current.signal });
      if (!response.ok || response.headers.get('content-type')?.includes('text/html')) throw new Error('download unavailable');
      const reader = response.body.getReader();
      const chunks = []; let received = 0;
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        chunks.push(value); received += value.length;
        setDownload({ state: 'loading', percent: Math.min(99, Math.round(received / product.download.bytes * 100)), message: '正在获取软件，请稍候。' });
      }
      const blob = new Blob(chunks, { type: 'application/x-7z-compressed' });
      if (blob.size !== product.download.bytes) throw new Error('size mismatch');
      if (crypto.subtle) {
        const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
        const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
        if (hash !== product.download.sha256) throw new Error('checksum mismatch');
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = product.download.filename;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setDownload({ state: 'done', percent: 100, message: '软件已准备好，请在浏览器中保存文件。' });
    } catch (error) {
      if (error.name !== 'AbortError') setDownload({ state: 'error', percent: 0, message: '下载未完成，请检查网络后重试。' });
    } finally { controller.current = null; }
  };

  return <>
    <a className="skip-link" href="#main">跳到主要内容</a>
    <header className="site-header">
      <div className="container header-inner">
        <Brand />
        <nav className="desktop-nav" aria-label="主导航">{navItems.map(([label, id]) => <a href={`#${id}`} key={id}>{label}</a>)}</nav>
        <div className="header-actions">
          <button className="icon-button theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`切换到${theme === 'dark' ? '浅色' : '深色'}模式`}>{theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}</button>
          <a className="header-download" href="#download">下载软件 <ArrowUpRight size={17} /></a>
          <button ref={menuTrigger} className="icon-button menu-toggle" aria-label={menuOpen ? '关闭导航菜单' : '打开导航菜单'} aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={24} /> : <List size={24} />}</button>
        </div>
      </div>
      {menuOpen && <nav ref={mobileMenu} id="mobile-menu" className="mobile-nav" aria-label="移动导航">{[...navItems, ['下载软件', 'download']].map(([label, id]) => <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>{label}<ArrowUpRight size={18} /></a>)}</nav>}
    </header>

    <main id="main">
      <section className="hero container" id="home">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" />BUILT FOR YOUR NEXT LEVEL</div>
          <h1>让实力，<br /><span>尽情释放。</span></h1>
          <p className="hero-description">以 VT 技术，探索游戏性能的更多可能。<br />少一点束缚，多一份掌控。你的主场，现在开启。</p>
          <div className="hero-actions"><a href="#download" className="button button-primary">下载软件 <DownloadSimple size={20} /></a><a href="#technology" className="text-link">探索核心技术 <ArrowUpRight size={19} /></a></div>
        </div>
        <HeroVisual theme={theme} />
      </section>

      <div className="principles container" aria-label="产品理念">
        <div><Cpu size={23} weight="light" /><span>硬件级虚拟化技术</span></div>
        <div><Lightning size={23} weight="light" /><span>为游戏性能而生</span></div>
        <div><GameController size={23} weight="light" /><span>以玩家体验为中心</span></div>
        <a href="#features">认识 VT助手 <ArrowDown size={17} /></a>
      </div>

      <section className="section container features" id="features">
        <div className="section-heading" data-reveal><h2>好状态，从底层开始。</h2><p>技术的意义，是让每一次投入都更尽兴。</p></div>
        <div className="feature-grid">
          <article className="feature-card feature-main" data-reveal>
            <div className="card-copy"><Cpu size={27} weight="light" /><h3>向下深入，<br />向上突破。</h3><p>以 VT 虚拟化技术为核心，<br />探索硬件潜能与游戏体验之间的更多可能。</p><a href="#technology" className="text-link">了解 VT 技术 <ArrowUpRight size={17} /></a></div>
            <div className="layer-art" aria-hidden="true"><div className="tech-layer layer-bottom" /><div className="tech-layer layer-middle" /><div className="tech-layer layer-top"><span>VT</span></div><div className="layer-orbit" /></div>
          </article>
          <article className="feature-card feature-focus" data-reveal><div className="focus-art" aria-hidden="true"><span className="focus-ring ring-outer" /><span className="focus-ring ring-inner" /><Crosshair weight="thin" /></div><div className="card-copy"><h3>让专注，留在游戏里。</h3><p>从每一次操作，到每一个关键时刻，<br />始终围绕玩家的真实体验。</p></div></article>
          <article className="feature-card feature-photo" data-reveal><img src="./images/gaming-setup.webp" alt="桌面上的游戏显示器与键盘" width="960" height="640" loading="lazy" /><div className="photo-shade" /><div className="card-copy"><GameController size={27} weight="light" /><h3>准备好，进入你的主场。</h3><p>把热爱交给游戏，把技术交给 VT助手。</p></div></article>
        </div>
      </section>

      <section className="section technology-section" id="technology">
        <div className="container technology-layout">
          <div className="technology-copy" data-reveal><div className="eyebrow">THE POWER BENEATH</div><h2>看不见的技术，<br />为看得见的体验。</h2><p>VT，让处理器支持硬件辅助的虚拟化。<br />VT助手以此为起点，探索更出色的游戏表现。</p><div className="technology-note"><Cpu size={21} /><span>由硬件能力出发，围绕游戏体验构建。</span></div><button ref={guideTrigger} className="text-link" onClick={() => setGuideOpen(true)}>我的电脑是否支持 VT？ <ArrowUpRight size={18} /></button></div>
          <div className="architecture" data-reveal aria-label="VT 技术概念示意，包含玩家体验、VT助手与硬件虚拟化三个层次">
            <div className="architecture-row"><GameController size={25} weight="light" /><span>你的游戏体验<small>YOUR GAME EXPERIENCE</small></span><span className="architecture-index">01</span></div>
            <div className="architecture-connector" aria-hidden="true"><span /><span /><span /></div>
            <div className="architecture-row architecture-core"><span className="mini-vt">VT</span><span>VT助手<small>BUILT AROUND THE PLAYER</small></span><Lightning size={21} /></div>
            <div className="architecture-connector" aria-hidden="true"><span /><span /><span /></div>
            <div className="architecture-row"><Cpu size={25} weight="light" /><span>硬件虚拟化<small>VIRTUALIZATION TECHNOLOGY</small></span><span className="architecture-index">03</span></div>
            <p className="diagram-caption">技术概念示意</p>
          </div>
        </div>
      </section>

      <section className="section container experience-section" aria-labelledby="experience-title">
        <div className="section-heading" data-reveal><h2 id="experience-title">你的热爱，不止一种。</h2><p>每一种游戏方式，都值得全力以赴。</p></div>
        <div className="experience-tabs" role="tablist" aria-label="游戏场景">{experiences.map((item, i) => <button key={item.label} role="tab" id={`tab-${i}`} aria-selected={activeTab === i} aria-controls="experience-panel" tabIndex={activeTab === i ? 0 : -1} onClick={() => setActiveTab(i)} onKeyDown={e => { let next; if (e.key === 'ArrowRight') next = (i + 1) % 3; if (e.key === 'ArrowLeft') next = (i + 2) % 3; if (e.key === 'Home') next = 0; if (e.key === 'End') next = 2; if (next !== undefined) { e.preventDefault(); setActiveTab(next); document.getElementById(`tab-${next}`).focus(); } }}><item.icon size={20} />{item.label}</button>)}</div>
        <div className={`experience-panel scene-${activeTab}`} id="experience-panel" role="tabpanel" aria-labelledby={`tab-${activeTab}`} tabIndex={0}>
          <div className="experience-art" aria-hidden="true"><div className="horizon" /><div className="scene-core"><current.icon size={92} weight="thin" /></div><div className="scene-ring scene-ring-one" /><div className="scene-ring scene-ring-two" /></div>
          <div className="experience-copy" key={activeTab}><span className="experience-label">{current.label}</span><h3>{current.title}</h3><p>{current.copy}</p><a className="text-link" href="#download">开始体验 <ArrowRight size={18} /></a></div>
        </div>
        <p className="performance-note">体验因硬件、系统与游戏而异，请以实际使用效果为准。</p>
      </section>

      <section className="section container guide-section" id="guide">
        <div className="section-heading" data-reveal><h2>下一场，轻松入场。</h2><p>从下载到开始，把准备工作变简单。</p></div>
        <ol className="steps">
          <li data-reveal><span className="step-number">01</span><div><h3>下载软件</h3><p>获取 VT助手软件包，<br />保存至你的电脑。</p><a className="text-link" href="#download">前往下载 <ArrowDown size={16} /></a></div></li>
          <li data-reveal><span className="step-number">02</span><div><h3>确认环境</h3><p>完整解压并阅读包内说明，<br />确认虚拟化状态与运行要求。</p><button className="text-link" onClick={() => setGuideOpen(true)}>查看准备指引 <ArrowUpRight size={16} /></button></div></li>
          <li data-reveal><span className="step-number">03</span><div><h3>开启体验</h3><p>按照软件说明完成配置，<br />进入游戏，找到你的状态。</p><span className="step-end"><Check size={16} /> 为下一场做好准备</span></div></li>
        </ol>
      </section>

      <section className="container download-section" id="download">
        <div className="download-surface" data-reveal><div className="download-monogram" aria-hidden="true">VT</div><div className="download-copy"><div className="eyebrow">YOUR NEXT LEVEL STARTS HERE</div><h2>实力就位。<br />现在，轮到你了。</h2><p>让 VT助手，成为你的下一位游戏搭档。</p></div><div className="download-action"><button className="button button-primary download-button" onClick={startDownload} disabled={download.state === 'loading'}>{download.state === 'loading' ? <><CircleNotch size={21} className="spinner" /> 正在下载 {download.percent}%</> : <>下载软件 <DownloadSimple size={22} /></>}</button><dl className="download-meta"><div><dt>当前版本</dt><dd className="download-version">{product.version}</dd></div><div><dt>最后更新</dt><dd><time dateTime={product.updatedAt}>{product.updatedAtLabel}</time></dd></div></dl><span className={`download-feedback ${download.state === 'error' ? 'download-error' : ''}`} role="status" aria-live="polite">{download.message || '下载后解压，按照包内说明开始使用。'}</span></div></div>
      </section>

      <section className="section container faq-section" id="faq"><div className="faq-heading" data-reveal><h2>你可能还想了解</h2><p>开始之前，解答几个小疑问。</p></div><div className="faq-list">{questions.map(([question, answer]) => <details key={question}><summary>{question}<CaretDown size={19} /></summary><p>{answer}</p></details>)}</div></section>
    </main>

    <footer className="site-footer container"><div><Brand footer /><p>技术在幕后，实力在场上。</p></div><div className="footer-right"><nav aria-label="页脚导航"><a href="#features">产品优势</a><a href="#guide">使用指引</a><a href="#faq">常见问题</a></nav><span>© {new Date().getFullYear()} VT助手. All rights reserved.</span></div></footer>

    <dialog ref={dialog} className="guide-dialog" aria-labelledby="guide-dialog-title" onCancel={() => setGuideOpen(false)} onClose={() => { setGuideOpen(false); }} onClick={e => { if (e.target === dialog.current) { const r = dialog.current.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) setGuideOpen(false); } }}><button className="icon-button dialog-close" aria-label="关闭指引" onClick={() => setGuideOpen(false)} autoFocus><X size={22} /></button><Cpu size={32} className="dialog-icon" /><h2 id="guide-dialog-title">开始前，确认 VT 状态。</h2><p>你可以先在 Windows 中完成以下检查。</p><ol><li><strong>打开任务管理器</strong><span>按 Ctrl + Shift + Esc，切换到“性能”页面。</span></li><li><strong>查看 CPU 信息</strong><span>选择 CPU，找到“虚拟化”一项，查看是否为“已启用”。</span></li><li><strong>阅读软件包说明</strong><span>如需开启虚拟化，请参考设备厂商的 BIOS / UEFI 文档。软件的具体环境要求以包内说明为准。</span></li></ol><div className="dialog-note"><Monitor size={20} /><span>网页无法直接读取你的 BIOS 设置，以上为手动检查方法。</span></div><button className="button button-primary" onClick={() => setGuideOpen(false)}>了解了 <CheckCircle size={20} /></button></dialog>
  </>;
}

createRoot(document.getElementById('root')).render(<App />);
