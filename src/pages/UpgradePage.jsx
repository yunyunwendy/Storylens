import { useState } from "react";
import { assetPath } from "../routing.js";
import "../styles/upgrade-page.css";

const basicFeatures = [
  "AI 生成专属故事",
  "AI 生成绘本角色形象",
  "AI 生成基础绘本插画",
  "支持儿童、宠物、情侣、个人成长等主题",
  "支持在线预览与基础排版",
];

const proFeatures = [
  "基础版全部功能",
  "更高质量 AI 插画生成",
  "角色一致性优化",
  "多页绘本自动排版",
  "更多绘本风格选择",
  "故事内容深度润色",
  "高清电子版导出",
  "适合分享、收藏或打印制作",
];

const footerGroups = [
  ["了解更多", "博客", "如何使用", "定价", "AI绘本案例", "创作指南"],
  ["关于", "联系我们", "隐私政策", "服务条款", "创作者计划", "用户协议"],
  ["社交", "小红书", "抖音", "微博", "Instagram"],
  ["创作生态", "AI绘本生成", "AI故事创作", "AI插画生成", "个性化角色"],
];

export default function UpgradePage({ onNavigate }) {
  const [billing, setBilling] = useState("monthly");
  const proPrice = billing === "monthly" ? "RMB 51" : "RMB 499";
  const originalPrice = billing === "monthly" ? "RMB 60/月" : "RMB 588/年";

  return (
    <main className="upgrade-page">
      <header className="upgrade-topbar" aria-label="顶部导航">
        <button className="upgrade-brand" type="button" onClick={() => onNavigate?.("/")}>
          <img src={assetPath("/landing-assets/logo-palette.png")} alt="" />
          <span>StoryLens</span>
        </button>
        <nav className="upgrade-nav" aria-label="升级页导航">
          <button type="button" onClick={() => onNavigate?.("/")}>主页</button>
          <button type="button" onClick={() => onNavigate?.("/panel")}>工作空间</button>
        </nav>
        <div className="upgrade-account">
          <span className="storylens-upgrade-button">升级</span>
          <img src={assetPath("/upgrade-assets/avatar-pro.png")} alt="" />
        </div>
      </header>

      <section className="upgrade-hero" aria-labelledby="upgrade-title">
        <h1 id="upgrade-title">选择你的套餐</h1>
        <div className="billing-toggle" role="group" aria-label="计费周期">
          <button className={billing === "monthly" ? "active" : ""} type="button" onClick={() => setBilling("monthly")}>月付</button>
          <button className={billing === "yearly" ? "active" : ""} type="button" onClick={() => setBilling("yearly")}>年付</button>
        </div>
      </section>

      <section className="plan-grid" aria-label="套餐列表">
        <article className="plan-card">
          <div className="plan-content">
            <h2>基础版 <span>Basic</span></h2>
            <p className="plan-intro">
              适合想快速体验 AI 绘本创作的用户。上传照片或输入角色设定后，AI 将自动生成专属故事文本与绘本插画，帮助你快速拥有一本个性化绘本。
            </p>
            <section className="plan-section">
              <h3>包含内容</h3>
              <ul>
                {basicFeatures.map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
            </section>
            <section className="plan-section">
              <h3>适合人群</h3>
              <p>初次体验用户、儿童故事创作、宠物纪念、情侣礼物、个人小故事记录。</p>
            </section>
          </div>
          <div className="plan-action">
            <div>
              <strong>免费</strong>
            </div>
            <button type="button" onClick={() => onNavigate?.("/second")}>开始</button>
          </div>
        </article>

        <article className="plan-card plan-card--pro">
          <div className="plan-content">
            <div className="plan-title-row">
              <h2 className="pro-title">pro</h2>
              <span className="pro-discount">省15%</span>
            </div>
            <p className="plan-intro">
              适合想要更完整、更精致绘本体验的用户。在基础版功能上，Pro 版提供更高质量的插画生成、更稳定的角色一致性，以及完整的图文排版体验。
            </p>
            <section className="plan-section">
              <h3>包含内容</h3>
              <ul>
                {proFeatures.map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
            </section>
            <section className="plan-section">
              <h3>适合人群</h3>
              <p>想制作完整绘本的家庭用户、情侣纪念、宠物故事、个人成长记录、疗愈故事创作及高质量内容分享用户。</p>
            </section>
          </div>
          <div className="plan-action">
            <div className="price-row">
              <strong>{proPrice}</strong>
              <span>{billing === "monthly" ? "/ 月" : "/ 年"}</span>
              <del>{originalPrice}</del>
            </div>
            <button type="button" onClick={() => onNavigate?.("/second")}>立即尝试</button>
            <small>* 随时取消</small>
          </div>
        </article>
      </section>

      <section className="payment-strip" aria-label="安全支付方式">
        <p>使用以下方式安全支付</p>
        <div>
          <span className="pay-icon pay-icon--alipay">支</span>
          <span className="pay-icon pay-icon--wechat">微</span>
        </div>
        <div className="pay-labels">
          <span>支付宝</span>
          <span>微信</span>
        </div>
      </section>

      <footer className="upgrade-footer">
        <div className="footer-brand">
          <button type="button" onClick={() => onNavigate?.("/")}>
            <img src={assetPath("/landing-assets/logo-palette.png")} alt="" />
            <span>StoryLens</span>
          </button>
          <small>@ 2026年 StoryLens.ai 公司</small>
        </div>
        <div className="footer-links">
          {footerGroups.map(([title, ...items]) => (
            <section key={title}>
              <h2>{title}</h2>
              {items.map((item) => <a href="#top" key={item}>{item}</a>)}
            </section>
          ))}
        </div>
      </footer>
    </main>
  );
}
