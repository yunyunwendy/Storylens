const API_BASE = "https://api.siliconflow.cn/v1";
const MAX_BODY_SIZE = 16 * 1024 * 1024;

const imageSizes = {
  "1:1": "1024x1024",
  "3:4": "960x1280",
  "16:9": "1664x928",
};

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    requireApiKey();
    const body = await readRequestBody(req);
    const prompt = normalizePrompt(body.prompt);
    const ratio = body.ratio || "3:4";
    const referenceImage = typeof body.image === "string" ? body.image : "";
    const modelName = body.modelName || "Midjourney";

    const storyPrompt = await createStoryPrompt({
      modelName,
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
  } catch (error) {
    const status = error.statusCode || 500;
    sendJson(res, status, {
      error: error.message || "Generation failed",
    });
  }
};

module.exports.config = {
  maxDuration: 60,
};

async function createStoryPrompt({ modelName, prompt, ratio, hasReference }) {
  const fallback = [
    "children's picture book illustration",
    "warm cinematic light",
    "expressive character",
    "gentle storybook texture",
    `story idea: ${prompt}`,
    `composition ratio: ${ratio}`,
    `selected AI tool: ${modelName}`,
    hasReference ? "keep the uploaded character identity and outfit as the main reference" : "",
  ].filter(Boolean).join(", ");

  try {
    const completion = await siliconFetch("/chat/completions", {
      model: getConfig().textModel,
      messages: [
        {
          role: "system",
          content: "You are a children's picture book visual prompt designer. Return one concise generation prompt in English with a little Chinese only when useful. Emphasize character consistency, storybook texture, composition, gentle emotion, and commercial-safe family-friendly content. Do not explain.",
        },
        {
          role: "user",
          content: `Selected tool: ${modelName}\nRatio: ${ratio}\nHas reference image: ${hasReference ? "yes" : "no"}\nUser request: ${prompt}`,
        },
      ],
      max_tokens: 520,
      temperature: 0.7,
      enable_thinking: false,
    });

    return completion?.choices?.[0]?.message?.content?.trim() || fallback;
  } catch {
    return fallback;
  }
}

async function createStoryText({ prompt, visualPrompt }) {
  const fallback = "在柔和的光里，故事的主角踏上了一段新的旅程。每一次回头都看见熟悉的爱，每一次向前都遇见闪闪发亮的勇气。";

  try {
    const completion = await siliconFetch("/chat/completions", {
      model: getConfig().textModel,
      messages: [
        {
          role: "system",
          content: "You are a Chinese children's picture book writer. Write 80 to 140 Chinese characters, warm, visual, suitable for a picture book page. Return only the story text.",
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
  const config = getConfig();
  const usingReference = Boolean(referenceImage);
  const model = usingReference ? config.imageModel : config.t2iModel;
  const payload = { model, prompt };

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
    throw new Error("Image generation did not return an image URL");
  }

  return {
    url,
    seed: result.seed,
    timings: result.timings,
  };
}

async function siliconFetch(endpoint, payload) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getConfig().apiKey}`,
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
    const error = new Error(message);
    error.statusCode = response.status >= 500 ? 502 : response.status;
    throw error;
  }

  return data;
}

function getConfig() {
  return {
    apiKey: process.env.SILICONFLOW_API_KEY,
    textModel: process.env.SILICONFLOW_TEXT_MODEL || "Pro/zai-org/GLM-4.7",
    imageModel: process.env.SILICONFLOW_IMAGE_MODEL || "Qwen/Qwen-Image-Edit-2509",
    t2iModel: process.env.SILICONFLOW_T2I_MODEL || "Kwai-Kolors/Kolors",
  };
}

function requireApiKey() {
  if (!getConfig().apiKey) {
    const error = new Error("Missing SILICONFLOW_API_KEY in Vercel environment variables");
    error.statusCode = 500;
    throw error;
  }
}

async function readRequestBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    return req.body ? JSON.parse(req.body) : {};
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_SIZE) {
      const error = new Error("Request body is too large");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function normalizePrompt(prompt) {
  const value = typeof prompt === "string" ? prompt.trim() : "";
  return value || "把上传的角色变成一本温暖、有冒险感的儿童绘本故事开场画面";
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}
