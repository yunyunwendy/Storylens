import { useEffect, useRef, useState } from "react";
import { assetPath, routePath } from "../routing.js";
import "../styles/landing.css";

const heroSlides = [
  assetPath("/landing-assets/hero-slides/hero-slide-01.jpg"),
  assetPath("/landing-assets/hero-slides/hero-slide-02.jpg"),
  assetPath("/landing-assets/hero-slides/hero-slide-03.jpg"),
  assetPath("/landing-assets/hero-slides/hero-slide-04.jpg"),
  assetPath("/landing-assets/hero-slides/hero-slide-05.jpg"),
  assetPath("/landing-assets/hero-slides/hero-slide-06.jpg"),
  assetPath("/landing-assets/hero-slides/hero-slide-07.jpg"),
];

export default function LandingPage({ onNavigate }) {
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const triggerRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    document.body.classList.toggle("modal-open", isUpgradeOpen);

    if (isUpgradeOpen) {
      closeRef.current?.focus();
    }

    return () => document.body.classList.remove("modal-open");
  }, [isUpgradeOpen]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsUpgradeOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveHeroIndex((index) => (index + 1) % heroSlides.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, []);

  function closeUpgrade() {
    setIsUpgradeOpen(false);
    triggerRef.current?.focus();
  }

  function handleNavigateToSecond(event) {
    event.preventDefault();
    onNavigate?.("/second");
  }

  function handleNavigateToUpgrade() {
    onNavigate?.("/page4");
  }

  return (
    <>
      <main className="page landing-page">
        <section className="hero" aria-label="StoryLens">
          <div className="hero__slides" aria-hidden="true">
            {heroSlides.map((src, index) => (
              <img
                className={`hero__slide${index === activeHeroIndex ? " is-active" : ""}`}
                src={src}
                alt=""
                key={src}
              />
            ))}
          </div>
          <a className="brand" href="#start" aria-label="StoryLens">
            <img src={assetPath("/landing-assets/logo-palette.png")} alt="" />
            <span>StoryLens</span>
          </a>
          <div className="hero-actions">
            <button
              className="nav-pill"
              type="button"
              aria-label="打开升级弹层"
              ref={triggerRef}
              onClick={handleNavigateToUpgrade}
            >
              <img src={assetPath("/landing-assets/upgrade-pill.jpg")} alt="升级" />
            </button>
            <img className="hero-avatar" src={assetPath("/upgrade-assets/avatar-pro.png")} alt="" />
          </div>
          <div className="hero__content">
            <h1>开启你的绘本之旅，把回忆变成会说话的故事。</h1>
            <a className="button button--hero" href={routePath("/second")} onClick={handleNavigateToSecond}>立即开始</a>
          </div>
        </section>

        <section className="section section--studio" id="start">
          <div className="section__head">
            <h2>专属创作台</h2>
            <p>统一调整文本和图片模型，让创作更简单。</p>
          </div>
          <img className="studio-visual" src={assetPath("/landing-assets/studio-workbench.jpg")} alt="专属创作台界面" />
          <a className="button" href={routePath("/second")} onClick={handleNavigateToSecond}>试用模型</a>
        </section>

        <section className="section section--engines" id="engines">
          <div className="section__head">
            <h2>强大引擎支持</h2>
            <p>我们接入了世界上最新最强大的图文的模型</p>
          </div>
          <div className="engine-strip" aria-label="引擎支持">
            <img className="engine-banner" src={assetPath("/landing-assets/engine-models-banner.jpg")} alt="Image 2、Nanobannana、Midjourney、Gemmi、即梦" />
          </div>
          <a className="button" href={routePath("/second")} onClick={handleNavigateToSecond}>试用模型</a>
        </section>

        <section className="section section--why" id="why">
          <div className="section__head">
            <h2>为什么选择Story Lens</h2>
            <p>你的故事，值得被全世界听见</p>
          </div>
          <img className="story-image" src={assetPath("/landing-assets/new-story.jpg")} alt="女孩在海边翻看自己的故事绘本" />
          <h3>创作你的分身，生成属于你的故事</h3>
          <a className="button" href={routePath("/second")} onClick={handleNavigateToSecond}>立即开始</a>
        </section>

        <section className="section section--templates" id="templates">
          <div className="section__head">
            <h2>你的故事很精彩，画面也该更出彩</h2>
            <p>海量风格模板，总有一款属于你</p>
          </div>
          <div className="gallery" aria-label="风格模板">
            <img src={assetPath("/landing-assets/gallery-01.jpg")} alt="窗台插画模板" />
            <img src={assetPath("/landing-assets/gallery-02.jpg")} alt="房子插画模板" />
            <img src={assetPath("/landing-assets/gallery-03.jpg")} alt="翻开的绘本模板" />
            <img src={assetPath("/landing-assets/gallery-04.jpg")} alt="幻想少女模板" />
            <img src={assetPath("/landing-assets/gallery-05.jpg")} alt="双人头像模板" />
            <img src={assetPath("/landing-assets/gallery-06.jpg")} alt="角色设定模板" />
            <img src={assetPath("/landing-assets/gallery-07.jpg")} alt="儿童角色模板" />
            <img src={assetPath("/landing-assets/gallery-08.jpg")} alt="睡前故事模板" />
            <img src={assetPath("/landing-assets/gallery-09.jpg")} alt="海边故事模板" />
          </div>
        </section>
      </main>

      <div className="modal" id="upgrade-modal" role="dialog" aria-modal="true" aria-labelledby="upgrade-title" hidden={!isUpgradeOpen}>
        <div className="modal__backdrop" onClick={closeUpgrade}></div>
        <div className="modal__panel">
          <button className="modal__close" type="button" aria-label="关闭弹层" ref={closeRef} onClick={closeUpgrade}>
            <span aria-hidden="true">×</span>
          </button>
          <h2 id="upgrade-title">升级 StoryLens</h2>
          <p>解锁更多绘本风格模板、高清生成和专属创作能力。</p>
          <a className="modal__action" href="#templates">立即升级</a>
        </div>
      </div>
    </>
  );
}
