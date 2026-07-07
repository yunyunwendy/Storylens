import { useEffect, useRef, useState } from "react";
import { assetPath, routePath } from "../routing.js";
import "../styles/second-page.css";

const works = [
  ["IMG_5820.JPG", "1000", "海边绘本"],
  ["IMG_5007.JPG", "2000", "星光角色"],
  ["IMG_5815.JPG", "1040", "梦境插画"],
  ["IMG_5014.JPG", "1660", "家庭回忆"],
  ["IMG_5015.JPG", "3004", "童话片段"],
  ["IMG_5006.JPG", "3999", "森林冒险"],
  ["IMG_5287.JPG", "4566", "角色设定"],
  ["IMG_5291.JPG", "1030", "故事场景"],
];

const features = [
  ["IMG_5692.JPG", "灵感模板上新", "精选绘本构图和角色风格，适合快速生成同款故事画面。"],
  ["IMG_5693.JPG", "创作赛：赢专属礼品", "选择角色照片和故事主题，即可生成参赛作品预览。"],
  ["IMG_5289.JPG", "本周主题：画出你的梦", "围绕梦境、旅行、家庭回忆生成连续故事画面。"],
];

const models = [
  ["Midjourney", "icon-midjourney.png"],
  ["Nanobanana", "icon-nanobanana.png"],
  ["Image 2", "agent-cube.png"],
  ["即梦", "icon-jimeng.png"],
  ["kimi", "icon-kimi.png"],
  ["Gemmi", "icon-gemini.png"],
  ["Chatgpt", "icon-chatgpt.png"],
  ["可画", "icon-canva.png"],
];

export default function SecondPage({ onNavigate }) {
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("Midjourney");
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [selectedRatio, setSelectedRatio] = useState("3:4");
  const [selectedSpeed, setSelectedSpeed] = useState("10s");
  const [activeInfo, setActiveInfo] = useState(null);
  const [selectedWork, setSelectedWork] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPhase, setGenerationPhase] = useState("");
  const [generationError, setGenerationError] = useState("");
  const modelPickerRef = useRef(null);
  const generateButtonRef = useRef(null);
  const modalCloseRef = useRef(null);
  const fileInputRef = useRef(null);
  const promptRef = useRef(null);

  useEffect(() => {
    function handleClick(event) {
      if (!modelPickerRef.current?.contains(event.target)) {
        setIsModelMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape" && !isGenerating) {
        closeGenerateModal();
      }
    }

    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isGenerating]);

  useEffect(() => {
    if (isGenerateOpen || isUpgradeOpen || activeInfo || selectedWork) {
      modalCloseRef.current?.focus();
    }
  }, [activeInfo, isGenerateOpen, isUpgradeOpen, selectedWork]);

  useEffect(() => {
    return () => {
      if (uploadedImage?.url) {
        URL.revokeObjectURL(uploadedImage.url);
      }
    };
  }, [uploadedImage]);

  function closeGenerateModal() {
    if (isGenerating) {
      return;
    }

    setIsModelMenuOpen(false);
    setIsGenerateOpen(false);
    setIsUpgradeOpen(false);
    setActiveInfo(null);
    setSelectedWork(null);
    setGenerationError("");
    generateButtonRef.current?.focus();
  }

  async function handleGenerate() {
    if (isGenerating) {
      return;
    }

    setIsGenerateOpen(true);
    setGenerationError("");
    setGenerationPhase("正在整理故事提示词、角色参考和画面比例...");
    setIsGenerating(true);

    try {
      const generationModel = selectedModel === "Agent" ? "Midjourney" : selectedModel;
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: promptRef.current?.value || "",
          image: uploadedImage?.dataUrl || "",
          ratio: selectedRatio,
          speed: selectedSpeed,
          modelName: generationModel,
        }),
      });

      const responseText = await response.text();
      let result = {};
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch {
        result = { error: responseText || "生成接口没有返回有效数据，请确认 API 服务已启动" };
      }

      if (!response.ok) {
        throw new Error(result?.error || result?.message || "生成失败，请确认 API 服务已启动");
      }

      const payload = {
        ...result,
        ratio: selectedRatio,
        speed: selectedSpeed,
        modelName: generationModel,
        userPrompt: promptRef.current?.value || "",
        referenceImage: uploadedImage?.dataUrl && uploadedImage.dataUrl.length < 2_200_000 ? uploadedImage.dataUrl : "",
        createdAt: Date.now(),
      };

      sessionStorage.setItem("storylens-generation", JSON.stringify(payload));
      setGenerationPhase("生成完成，正在进入工作空间...");
      window.setTimeout(() => onNavigate?.("/panel"), 300);
    } catch (error) {
      setGenerationError(error.message || "生成失败，请稍后重试");
      setGenerationPhase("");
      setIsGenerating(false);
    }
  }

  async function handleUploadChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (uploadedImage?.url) {
      URL.revokeObjectURL(uploadedImage.url);
    }

    setUploadedImage({
      name: file.name,
      url: URL.createObjectURL(file),
      dataUrl: await readFileAsDataUrl(file),
    });
  }

  function cycleRatio() {
    const ratios = ["3:4", "1:1", "16:9"];
    const currentIndex = ratios.indexOf(selectedRatio);
    setSelectedRatio(ratios[(currentIndex + 1) % ratios.length]);
  }

  function cycleSpeed() {
    const speeds = ["10s", "20s", "30s"];
    const currentIndex = speeds.indexOf(selectedSpeed);
    setSelectedSpeed(speeds[(currentIndex + 1) % speeds.length]);
  }

  function handleNavigateToWorkspace(event) {
    event.preventDefault();
    onNavigate?.("/panel");
  }

  function handleNavigateHome(event) {
    event.preventDefault();
    onNavigate?.("/");
  }

  function handleGenerateSame() {
    if (!selectedWork) {
      return;
    }

    sessionStorage.setItem("storylens-generation", JSON.stringify({
      prompt: `参考精选作品《${selectedWork.title}》生成同款绘本画面，保留温暖、细腻、儿童绘本质感。`,
      storyText: `新的故事从《${selectedWork.title}》的画面气质出发：主角走进柔和的光里，遇见一段关于想象、陪伴与勇气的绘本旅程。`,
      imageUrl: assetPath(`/second-page-assets/${selectedWork.image}`),
      referenceImage: "",
      ratio: "3:4",
      speed: "10s",
      modelName: selectedModel === "Agent" ? "Midjourney" : selectedModel,
      createdAt: Date.now(),
      source: "same-style",
    }));
    onNavigate?.("/panel");
  }

  return (
    <div className="second-page-viewport">
      <div className="second-page">
        <main className="page">
          <section className="hero" id="home">
            <img className="hero-bg" src={assetPath("/second-page-assets/IMG_5005.JPG")} alt="" />
            <div className="hero-shade" aria-hidden="true"></div>
            <header className="nav">
              <a className="brand" href="#home" aria-label="StoryLens">
                <img src={assetPath("/second-page-assets/book.png")} alt="" />
                <span>StoryLens</span>
              </a>
              <nav className="links" aria-label="主导航">
                <a href={routePath("/")} onClick={handleNavigateHome}>主页</a>
                <a href="#ideas">创意灵感</a>
                <a href={routePath("/panel")} onClick={handleNavigateToWorkspace}>工作空间</a>
              </nav>
              <div className="nav-actions">
                <button className="upgrade" type="button" onClick={() => onNavigate?.("/page4")}>升级</button>
                <img className="nav-avatar" src={assetPath("/upgrade-assets/avatar-pro.png")} alt="" />
              </div>
            </header>

            <div className="hero-content">
              <h1>这里，每个人的故事都是畅销书</h1>
              <div className="prompt-panel">
                <button className={`upload-card${uploadedImage ? " has-upload" : ""}`} type="button" aria-label="上传角色照片" onClick={() => fileInputRef.current?.click()}>
                  <img src={uploadedImage?.url || assetPath("/second-page-assets/upload.png")} alt="" />
                </button>
                <input className="file-input" ref={fileInputRef} type="file" accept="image/*" onChange={handleUploadChange} />
                <textarea ref={promptRef} placeholder="上传角色照片，让我想想他（她）最适合什么故事……”"></textarea>
                <button className="generate" id="generateButton" type="button" ref={generateButtonRef} disabled={isGenerating} onClick={handleGenerate}>
                  {isGenerating ? "生成中" : "生成"}
                </button>
                <div className="controls">
                  <div className={`model-selector${isModelMenuOpen ? " open" : ""}`} id="modelPicker" ref={modelPickerRef}>
                    <button
                      className="chip active"
                      id="modelButton"
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={isModelMenuOpen}
                      aria-controls="modelMenu"
                      onClick={(event) => {
                        event.stopPropagation();
                        setIsModelMenuOpen((isOpen) => !isOpen);
                      }}
                    >
                      <img className="agent-icon" src={assetPath("/second-page-assets/agent-cube.png")} alt="" />
                      <span>{selectedModel}</span>
                    </button>
                    <div className="model-menu" id="modelMenu" role="listbox" aria-label="模型列表" hidden={!isModelMenuOpen}>
                      {models.map(([name, icon]) => (
                        <button
                          className="model-option"
                          type="button"
                          role="option"
                          aria-selected={selectedModel === name}
                          data-model={name}
                          key={name}
                          onClick={() => {
                            setSelectedModel(name);
                            setIsModelMenuOpen(false);
                          }}
                        >
                          <img src={assetPath(`/second-page-assets/${icon}`)} alt="" />
                          <span>{name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button className="chip ratio-chip" type="button" onClick={cycleRatio}>
                    <span className="ratio-icon" aria-hidden="true"></span>
                    <span>{selectedRatio}</span>
                  </button>
                  <button className="chip speed-chip" type="button" onClick={cycleSpeed}>
                    <span>速度&nbsp;&nbsp;{selectedSpeed}</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="feature-strip" id="ideas" aria-label="创意灵感">
            {features.map(([image, title, message]) => (
              <button className="feature-card" type="button" key={title} onClick={() => setActiveInfo({ image, title, message })}>
                <img src={assetPath(`/second-page-assets/${image}`)} alt="" />
                <strong>{title}</strong>
              </button>
            ))}
          </section>

          <section className="playbook" aria-label="爆款玩法">
            <img className="playbook-bg" src={assetPath("/second-page-assets/IMG_5277.JPG")} alt="" />
            <div className="playbook-overlay" aria-hidden="true"></div>
            <div className="playbook-copy">
              <h2>爆款玩法</h2>
              <p>建立你的分身</p>
              <button type="button" onClick={() => setActiveInfo({ title: "爆款玩法", message: "上传角色照片后，StoryLens 会自动生成适合分身的故事分镜和画面风格。" })}>立即体验</button>
            </div>
            <div className="playbook-gallery">
              <img src={assetPath("/second-page-assets/IMG_5822.JPG")} alt="" />
              <img src={assetPath("/second-page-assets/IMG_5791.JPG")} alt="" />
              <img src={assetPath("/second-page-assets/IMG_5295.JPG")} alt="" />
            </div>
            <h3>不用画笔，只需一个念头，StoryLens 帮你把童话变现</h3>
          </section>

          <section className="works" id="workspace">
            <h2>精选作品</h2>
            <div className="grid" id="grid">
              {works.map(([image, views, title]) => (
                <button className="work-card" type="button" key={image} onClick={() => setSelectedWork({ image, views, title })}>
                  <img className="work-image" src={assetPath(`/second-page-assets/${image}`)} alt="" />
                  <span className="views">
                    <img className="eye-icon" src={assetPath("/second-page-assets/eye.png")} alt="" />
                    {views}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </main>

        <div className="modal-layer" id="generateModal" hidden={!isGenerateOpen && !isUpgradeOpen && !activeInfo && !selectedWork} onClick={closeGenerateModal}>
          <section className={`modal${selectedWork ? " modal--work" : ""}`} role="dialog" aria-modal="true" aria-labelledby="generateTitle" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" id="modalClose" type="button" aria-label="关闭" ref={modalCloseRef} disabled={isGenerating} onClick={closeGenerateModal}>×</button>
            {selectedWork ? (
              <>
                <img className="modal-work-image" src={assetPath(`/second-page-assets/${selectedWork.image}`)} alt="" />
                <h2 id="generateTitle">{selectedWork.title}</h2>
                <p id="generateMessage">浏览量 {selectedWork.views}，点击生成页可用同类风格继续创作。</p>
                <button className="modal-generate-same" type="button" onClick={handleGenerateSame}>生成同款</button>
              </>
            ) : activeInfo ? (
              <>
                {activeInfo.image && <img className="modal-info-image" src={assetPath(`/second-page-assets/${activeInfo.image}`)} alt="" />}
                <h2 id="generateTitle">{activeInfo.title}</h2>
                <p id="generateMessage">{activeInfo.message}</p>
              </>
            ) : isUpgradeOpen ? (
              <>
                <h2 id="generateTitle">升级 StoryLens</h2>
                <p id="generateMessage">解锁更多绘本模板、高清生成和专属创作空间。</p>
                <div className="modal-preview" aria-hidden="true"></div>
              </>
            ) : (
              <>
                <h2 id="generateTitle">{generationError ? "生成失败" : "生成中"}</h2>
                <p className={generationError ? "generation-error" : "generation-phase"} id="generateMessage">
                  {generationError || generationPhase || "StoryLens 正在根据角色照片和提示词生成故事画面。"}
                </p>
                <div className="modal-preview modal-preview--loading" aria-hidden="true"></div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
