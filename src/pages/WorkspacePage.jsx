import { useEffect, useMemo, useRef, useState } from "react";
import { assetPath, routePath } from "../routing.js";
import "../styles/workspace.css";

const DESIGN_WIDTH = 2000;
const DESIGN_HEIGHT = 1280;
const VISUAL_SCALE = 1.04;

const nodeFrames = {
  reference: { x: 121, y: 359, width: 416, height: 280 },
  story: { x: 730, y: 153, width: 415, height: 280 },
  image: { x: 730, y: 620, width: 415, height: 280 },
  panel: { x: 1428, y: 195, width: 498, height: 883 },
};

const defaultOffsets = {
  reference: { x: 0, y: 0 },
  story: { x: 0, y: 0 },
  image: { x: 0, y: 0 },
  panel: { x: 0, y: 0 },
};

const imageModels = [
  ["Midjourney", "icon-midjourney.png"],
  ["Nanobanana", "icon-nanobanana.png"],
  ["Image 2", "agent-cube.png"],
  ["即梦", "icon-jimeng.png"],
];

const textModels = [
  ["kimi", "icon-kimi.png"],
  ["Gemmi", "icon-gemini.png"],
  ["Chatgpt", "icon-chatgpt.png"],
];

const panelModels = [
  ...imageModels,
  ...textModels,
  ["可画", "icon-canva.png"],
];

export default function WorkspacePage({ onNavigate }) {
  const stageRef = useRef(null);
  const textareaRef = useRef(null);
  const dragRef = useRef(null);
  const [status, setStatus] = useState("");
  const [generation, setGeneration] = useState(null);
  const [nodeOffsets, setNodeOffsets] = useState(defaultOffsets);
  const [activeModelMenu, setActiveModelMenu] = useState("");
  const [nodeModels, setNodeModels] = useState({
    story: "kimi",
    image: "Midjourney",
    composer: "Midjourney",
  });
  const [nodeModes, setNodeModes] = useState({
    story: "Agent",
    image: "Agent",
    composer: "Agent",
  });

  useEffect(() => {
    function fitStage() {
      if (window.innerWidth <= 1440) {
        stageRef.current?.style.setProperty("--stage-scale", "1");
        return;
      }

      const scale = Math.min(
        window.innerWidth / DESIGN_WIDTH,
        window.innerHeight / DESIGN_HEIGHT,
      ) * VISUAL_SCALE;
      stageRef.current?.style.setProperty("--stage-scale", scale.toFixed(4));
    }

    fitStage();
    window.addEventListener("resize", fitStage);
    return () => window.removeEventListener("resize", fitStage);
  }, []);

  useEffect(() => {
    function handleDocumentClick() {
      setActiveModelMenu("");
    }

    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem("storylens-generation");
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      setGeneration(parsed);
      if (parsed.modelName && parsed.modelName !== "Agent") {
        const isImageModel = imageModels.some(([name]) => name === parsed.modelName);
        const isTextModel = textModels.some(([name]) => name === parsed.modelName);
        setNodeModels((current) => ({
          ...current,
          ...(isImageModel ? { image: parsed.modelName } : {}),
          ...(isTextModel ? { story: parsed.modelName } : {}),
          ...(panelModels.some(([name]) => name === parsed.modelName) ? { composer: parsed.modelName } : {}),
        }));
      }
      setStatus("已载入生成结果");
    } catch {
      setStatus("生成结果读取失败");
    }
  }, []);

  const connections = useMemo(() => {
    const point = (key, side) => {
      const frame = nodeFrames[key];
      const offset = nodeOffsets[key] || defaultOffsets[key];
      const x = frame.x + offset.x;
      const y = frame.y + offset.y;

      if (side === "right") {
        return { x: x + frame.width, y: y + frame.height / 2 };
      }
      if (side === "left") {
        return { x, y: y + frame.height / 2 };
      }
      if (side === "bottom") {
        return { x: x + frame.width / 2, y: y + frame.height };
      }
      return { x: x + frame.width / 2, y };
    };

    return [
      { id: "reference-image", from: point("reference", "right"), to: point("image", "left"), main: true },
      { id: "reference-story", from: point("reference", "right"), to: point("story", "left") },
      { id: "story-panel", from: point("story", "right"), to: point("panel", "left") },
      { id: "image-panel", from: point("image", "right"), to: point("panel", "left") },
    ];
  }, [nodeOffsets]);

  function startDrag(key, event) {
    if (window.matchMedia("(max-width: 820px)").matches || event.button !== 0) {
      return;
    }

    const scale = Number(stageRef.current?.style.getPropertyValue("--stage-scale")) || 1;
    dragRef.current = {
      key,
      scale,
      startX: event.clientX,
      startY: event.clientY,
      base: nodeOffsets[key],
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveDrag(event) {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }

    const nextX = drag.base.x + (event.clientX - drag.startX) / drag.scale;
    const nextY = drag.base.y + (event.clientY - drag.startY) / drag.scale;
    setNodeOffsets((current) => ({
      ...current,
      [drag.key]: {
        x: Math.round(nextX),
        y: Math.round(nextY),
      },
    }));
  }

  function endDrag() {
    dragRef.current = null;
  }

  function draggableStyle(key) {
    const offset = nodeOffsets[key] || defaultOffsets[key];
    return {
      "--drag-x": `${offset.x}px`,
      "--drag-y": `${offset.y}px`,
    };
  }

  function selectModel(id, name) {
    setNodeModels((current) => ({ ...current, [id]: name }));
    setActiveModelMenu("");
    setStatus(`${name} 已应用到当前节点`);
  }

  function setNodeMode(id, mode) {
    setNodeModes((current) => ({ ...current, [id]: mode }));
    setStatus(`${nodeModels[id] || "Agent"} 已切换为 ${mode}`);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.placeholder = "已加入生成队列";
    }
    setStatus("已加入生成队列");
  }

  function handleAdd() {
    textareaRef.current?.focus();
    setStatus("可以继续补充角色照片、故事风格或分镜需求");
  }

  const referenceImage = generation?.referenceImage || "";
  const imageUrl = generation?.imageUrl || "";
  const storyText = generation?.storyText || "";

  return (
    <main className="workspace-page" aria-label="StoryLens 工作空间">
      <div className="workspace-stage" ref={stageRef}>
        <header className="workspace-topbar" aria-label="顶部导航">
          <a className="workspace-brand" href={routePath("/")} aria-label="StoryLens">
            <img src={assetPath("/panel/logo.png")} alt="" />
            <span>StoryLens</span>
          </a>
          <nav className="workspace-center-nav" aria-label="工作台导航">
            <button type="button" onClick={() => onNavigate?.("/")}>主页</button>
            <h1>工作空间</h1>
          </nav>
          <button className="storylens-upgrade-button workspace-upgrade" type="button" onClick={() => onNavigate?.("/page4")}>升级</button>
        </header>

        <WorkspaceConnections connections={connections} />

        <section className="workspace-node workspace-node-reference workspace-draggable" style={draggableStyle("reference")} aria-labelledby="reference-title">
          <div className="workspace-node-title workspace-drag-handle" id="reference-title" onPointerDown={(event) => startDrag("reference", event)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
            <span>参考图（人物）</span>
          </div>
          <figure className="workspace-media-card workspace-reference-card">
            {referenceImage ? (
              <img src={referenceImage} alt="角色参考图" />
            ) : (
              <EmptyNode label="等待上传角色参考图" />
            )}
          </figure>
        </section>

        <section className="workspace-node workspace-node-story workspace-draggable" style={draggableStyle("story")} aria-labelledby="story-title">
          <div className="workspace-node-title workspace-drag-handle" id="story-title" onPointerDown={(event) => startDrag("story", event)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
            <span>绘本故事叙述</span>
            <NodeControls
              id="story"
              models={textModels}
              model={nodeModels.story}
              mode={nodeModes.story}
              isOpen={activeModelMenu === "story"}
              onOpen={setActiveModelMenu}
              onSelect={selectModel}
              onSetMode={setNodeMode}
            />
          </div>
          <article className="workspace-media-card workspace-wide-card workspace-story-card">
            {storyText ? <p>{storyText}</p> : <EmptyNode label="等待生成绘本故事叙述" />}
          </article>
        </section>

        <section className="workspace-node workspace-node-image workspace-draggable" style={draggableStyle("image")} aria-labelledby="image-title">
          <div className="workspace-node-title workspace-drag-handle" id="image-title" onPointerDown={(event) => startDrag("image", event)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
            <span>图像生成</span>
            <NodeControls
              id="image"
              models={imageModels}
              model={nodeModels.image}
              mode={nodeModes.image}
              isOpen={activeModelMenu === "image"}
              onOpen={setActiveModelMenu}
              onSelect={selectModel}
              onSetMode={setNodeMode}
            />
          </div>
          <figure className="workspace-media-card workspace-wide-card">
            {imageUrl ? (
              <img src={imageUrl} alt="生成的绘本画面" />
            ) : (
              <EmptyNode label="等待生成绘本画面" />
            )}
          </figure>
        </section>

        <aside className="workspace-storybook-panel workspace-draggable" style={draggableStyle("panel")} aria-label="制作画册">
          <div className="workspace-panel-head workspace-drag-handle" onPointerDown={(event) => startDrag("panel", event)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
            <span className="workspace-library-icon" aria-hidden="true"></span>
            <strong>制作画册</strong>
          </div>
          <div className="workspace-panel-body">
            {generation ? (
              <div className="workspace-generation-summary">
                <strong>生成提示词</strong>
                <p>{generation.prompt}</p>
                <dl>
                  <div>
                    <dt>模型</dt>
                    <dd>{generation.modelName || nodeModels.composer || "Midjourney"}</dd>
                  </div>
                  <div>
                    <dt>比例</dt>
                    <dd>{generation.ratio}</dd>
                  </div>
                  <div>
                    <dt>叙述</dt>
                    <dd>已生成</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <div className="workspace-empty-panel">开始生成后，提示词、模型和画册信息会显示在这里。</div>
            )}
          </div>
          <form className="workspace-composer" onSubmit={handleSubmit}>
            <label className="workspace-sr-only" htmlFor="request">描述需求</label>
            <p className="workspace-safety-reminder">提醒：避免生成恐怖、血腥、暴力、诡异或令人不适的图文内容</p>
            <textarea id="request" ref={textareaRef} placeholder="描述需求"></textarea>
            <div className="workspace-composer-actions">
              <button className="workspace-round-action" type="button" aria-label="添加" onClick={handleAdd}></button>
              <NodeControls
                id="composer"
                models={panelModels}
                model={nodeModels.composer}
                mode={nodeModes.composer}
                isOpen={activeModelMenu === "composer"}
                onOpen={setActiveModelMenu}
                onSelect={selectModel}
                onSetMode={setNodeMode}
                compact
              />
              <button className="workspace-send" type="submit" aria-label="发送"></button>
            </div>
          </form>
        </aside>

        <img className="workspace-toolbar" src={assetPath("/panel/toolbar.png")} alt="工作空间工具栏" />
        <div className="workspace-status" role="status" aria-live="polite" hidden={!status}>{status}</div>
      </div>
    </main>
  );
}

function EmptyNode({ label }) {
  return (
    <div className="workspace-empty-node">
      <span>{label}</span>
    </div>
  );
}

function WorkspaceConnections({ connections }) {
  return (
    <svg className="workspace-connections" viewBox={`0 0 ${DESIGN_WIDTH} ${DESIGN_HEIGHT}`} aria-hidden="true">
      <defs>
        <linearGradient id="workspace-line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#090909" stopOpacity=".85" />
          <stop offset="42%" stopColor="#f8f8f8" stopOpacity=".78" />
          <stop offset="100%" stopColor="#282828" stopOpacity=".68" />
        </linearGradient>
        <filter id="workspace-line-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {connections.map((connection) => (
        <path
          className={connection.main ? "workspace-connection workspace-connection--main" : "workspace-connection"}
          d={createPath(connection.from, connection.to)}
          filter="url(#workspace-line-glow)"
          key={connection.id}
        />
      ))}
    </svg>
  );
}

function NodeControls({ id, models, model, mode, isOpen, onOpen, onSelect, onSetMode, compact = false }) {
  return (
    <span className={`workspace-node-controls${compact ? " workspace-node-controls--compact" : ""}`} onPointerDown={(event) => event.stopPropagation()}>
      <span className="workspace-model-control">
        <button
          className="workspace-model-button"
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={(event) => {
            event.stopPropagation();
            onOpen(isOpen ? "" : id);
          }}
        >
          {model || models[0]?.[0] || "Agent"}
        </button>
        <span className="workspace-mode-group" aria-label="Auto Agent 切换">
          {["Agent", "Auto"].map((nextMode) => (
            <button
              className={mode === nextMode ? "active" : ""}
              type="button"
              key={nextMode}
              onClick={(event) => {
                event.stopPropagation();
                onSetMode(id, nextMode);
              }}
            >
              {nextMode}
            </button>
          ))}
        </span>
        {isOpen ? (
          <span className="workspace-model-menu" role="listbox">
            {models.map(([name, icon]) => (
              <button
                className="workspace-model-option"
                type="button"
                role="option"
                aria-selected={model === name}
                key={name}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(id, name);
                }}
              >
                <img src={assetPath(`/second-page-assets/${icon}`)} alt="" />
                <span>{name}</span>
              </button>
            ))}
          </span>
        ) : null}
      </span>
    </span>
  );
}

function createPath(from, to) {
  const distance = Math.max(120, Math.abs(to.x - from.x) * 0.52);
  const c1 = { x: from.x + distance, y: from.y };
  const c2 = { x: to.x - distance, y: to.y };
  return `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`;
}
