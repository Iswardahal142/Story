// api/image.js — Next.js API Route
// HuggingFace image generation proxy
// Agar browser se direct HF call CORS block kare toh yeh use hoga
// index.html mein: fetch('/api/image', ...) se call karo

const HF_MODEL = 'black-forest-labs/FLUX.1-schnell';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, hfToken } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'prompt required hai' });
  }

  // Token: body se lo, ya env se fallback
  const token = hfToken || process.env.HF_TOKEN;
  if (!token) {
    return res.status(401).json({ error: 'HuggingFace token nahi mila. HF_TOKEN env set karo ya body mein bhejo.' });
  }

  try {
    const hfRes = await fetch(
      `https://api-inference.huggingface.co/models/${HF_MODEL}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-use-cache': 'false',
        },
        body: JSON.stringify({
          inputs: prompt + ', dark horror atmosphere, dramatic lighting, high quality, detailed',
        }),
      }
    );

    if (hfRes.status === 503) {
      const errJson = await hfRes.json().catch(() => ({}));
      return res.status(503).json({
        error: 'model_loading',
        estimated_time: errJson.estimated_time || 30,
      });
    }

    if (hfRes.status === 401) {
      return res.status(401).json({ error: 'Invalid HuggingFace token' });
    }

    if (!hfRes.ok) {
      const errText = await hfRes.text().catch(() => String(hfRes.status));
      return res.status(hfRes.status).json({ error: errText });
    }

    // HF returns image bytes directly
    const imageBuffer = await hfRes.arrayBuffer();
    const contentType = hfRes.headers.get('content-type') || 'image/jpeg';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(Buffer.from(imageBuffer));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
