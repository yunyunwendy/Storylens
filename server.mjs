import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5174);
const API_BASE = "https://api.siliconflow.cn/v1";
const MAX_BODY_SIZE = 16 * 1024 * 1024;

loadEnvFile(path.join(__dirname, ".env.local"));

const config = {
  apiKey: process.env.SILICONFLOW_API_KEY,
  textModel: process.env.SILICONFLOW_TEXT_MODEL || "Pro/zai-org/GLM-4.7",
  imageModel: process.env.SILICONFLOW_IMAGE_MODEL || "Qwen/Qwen-Image-Edit-2509",
  t2iModel: process.env.SILICONFLOW_T2I_MODEL || "Kwai-Kolors/Kolors",
  videoModel: process.env.SILICONFLOW_VIDEO_MODEL || "Wan-AI/Wan2.2-I2V-A14B",
};

const imageSizes = {
  "1:1": "1024x1024",
  "3:4": "960x1280",
  "16:9": "1664x928",
};

const videoSizes = {
  "1:1": "960x960",
  "3:4": "720x1280",
  "16:9": "1280x720",
};

const vite = await createViteServer({
  appType: "spa",
  server: { middlewareMode: true },
});

http
  .createServer(async (req, res) => {
    try {
      if (req.url?.startsWith("/api/generate") && req.method === "POST") {
        await handleGenerate(req, res);
        return;
      }

      if (req.url?.startsWith("/api/video/status") && req.method === "POST") {
        await handleVideoStatus(req, res);
        return;
      }

      vite.middlewares(req, res, () => {
        sendJson(res, 404, { error: "Not found" });
      });
    } catch (error) {
      console.error(error);
      sendJson(res, 500, { error: error.message || "Server error" });
    }
  })
  .listen(PORT, () => {
    console.log(`StoryLens dev server: http://localhost:${PORT}/`);
  });

async function handleGenerate(req, res) {
  requireApiKey();
  const body = await readJson(req);
  const prompt = normalizePrompt(body.prompt);
  const ratio = body.ratio || "3:4";
  const referenceImage = typeof body.image === "string" ? body.image : "";

  const storyPrompt = await createStoryPrompt({
    modelName: body.modelName || "Agent",
    prompt,
    ratio,
    hasReference: Boolean(referenceImage),
  });
  const storyText = await createStoryText({ prompt, visualPrompt: storyPrompt });

  const imageResult = await createImage({
    prompt: storyPrompt,
    ratio,
    referenceImage,
  });

  sendJson(res, 200, {
    prompt: storyPrompt,
    storyText,
    imageUrl: imageResult.url,
    imageSeed: imageResult.seed,
    imageTimings: imageResult.timings,
    videoRequestId: "",
    videoError: "",
  });
}

async function handleVideoStatus(req, res) {
  requireApiKey();
  const body = await readJson(req, 1024 * 1024);
  if (!body.requestId) {
    sendJson(res, 400, { error: "Missing requestId" });
    return;
  }

  const result = await siliconFetch("/video/status", {
    requestId: body.requestId,
  });
  sendJson(res, 200, result);
}

async function createStoryPrompt({ modelName, prompt, ratio, hasReference }) {
  const fallback = [
    "children's picture book illustration, warm cinematic light, expressive character, gentle storybook texture",
    `story idea: ${prompt}`,
    `composition ratio: ${ratio}`,
    hasReference ? "keep the uploaded character identity and outfit as the main reference" : "",
  ].filter(Boolean).join(", ");

  try {
    const completion = await siliconFetch("/chat/completions", {
      model: config.textModel,
      messages: [
        {
          role: "system",
          content: "你是儿童绘本分镜和视觉提示词设计师。输出一段可直接用于图像/视频生成的中英混合提示词，强调角色一致性、绘本质感、镜头构图和画面情绪，不要解释。",
        },
        {
          role: "user",
          content: `用户选择模型：${modelName}\n画面比例：${ratio}\n是否有角色参考图：${hasReference ? "有" : "无"}\n用户需求：${prompt}`,
        },
      ],
      max_tokens: 520,
      temperature: 0.7,
      enable_thinking: false,
    });

    return completion?.choices?.[0]?.message?.content?.trim() || fallback;
  } catch (error) {
    return fallback;
  }
}

async function createStoryText({ prompt, visualPrompt }) {
  const fallback = "在柔和的光里，故事的主角踏上了一段新的旅程。每一次回头都看见熟悉的爱，每一次向前都遇见闪闪发亮的勇气。";

  try {
    const completion = await siliconFetch("/chat/completions", {
      model: config.textModel,
      messages: [
        {
          role: "system",
          content: "你是儿童绘本作者。请输出一段中文绘本故事叙述，80到140字，温暖、有画面感，适合放在绘本页面旁白里。只输出正文。",
        },
        {
          role: "user",
          content: `用户需求：${prompt}\n视觉提示词：${visualPrompt}`,
        },
      ],
      max_tokens: 240,
      temperature: 0.75,
      enable_thinking: false,
    });

    return completion?.choices?.[0]?.message?.content?.trim() || fallback;
  } catch {
    return fallback;
  }
}

async function createImage({ prompt, ratio, referenceImage }) {
  const usingReference = Boolean(referenceImage);
  const model = usingReference ? config.imageModel : config.t2iModel;
  const payload = {
    model,
    prompt,
  };

  if (usingReference) {
    payload.image = referenceImage;
  }

  if (!model.includes("Image-Edit")) {
    payload.image_size = imageSizes[ratio] || imageSizes["3:4"];
    payload.batch_size = 1;
    payload.num_inference_steps = 20;
    payload.guidance_scale = 7.5;
  }

  const result = await siliconFetch("/images/generations", payload);
  const url = result?.images?.[0]?.url;
  if (!url) {
    throw new Error("图片生成接口没有返回图片 URL");
  }

  return {
    url,
    seed: result.seed,
    timings: result.timings,
  };
}

async function submitVideo({ prompt, ratio, imageUrl }) {
  const result = await siliconFetch("/video/submit", {
    model: config.videoModel,
    prompt,
    image: imageUrl,
    image_size: videoSizes[ratio] || videoSizes["3:4"],
  });

  return result;
}

async function siliconFetch(endpoint, payload) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    const message = data?.message || data?.error?.message || data?.error || `SiliconFlow request failed: ${response.status}`;
    throw new Error(message);
  }

  return data;
}

function requireApiKey() {
  if (!config.apiKey) {
    throw new Error("Missing SILICONFLOW_API_KEY in .env.local");
  }
}

function normalizePrompt(prompt) {
  const value = typeof prompt === "string" ? prompt.trim() : "";
  return value || "把上传的角色变成一本温暖、有冒险感的儿童绘本故事开场画面";
}

function readJson(req, maxSize = MAX_BODY_SIZE) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxSize) {
        reject(new Error("Request body is too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      if (!text) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(text));
      } catch {
        reject(new Error("Invalid JSON request body"));
      }
    });

    req.on("error", reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    if (index === -1) {
      continue;
    }

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
