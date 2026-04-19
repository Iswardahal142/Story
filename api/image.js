export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.HF_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'HF_TOKEN not configured on server' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'prompt required' });
    }

    const hfRes = await fetch(
      'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-use-cache': 'false',
        },
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    if (hfRes.status === 503) {
      const errJson = await hfRes.json().catch(() => ({}));
      return res.status(503).json({
        error: 'model_loading',
        estimated_time: errJson.estimated_time || 25,
      });
    }

    if (hfRes.status === 401 || hfRes.status === 403) {
      return res.status(401).json({ error: 'Invalid HuggingFace token' });
    }

    if (hfRes.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    if (!hfRes.ok) {
      const errText = await hfRes.text().catch(() => String(hfRes.status));
      return res.status(hfRes.status).json({ error: errText });
    }

    const imageBuffer = await hfRes.arrayBuffer();
    const contentType = hfRes.headers.get('content-type') || 'image/jpeg';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(Buffer.from(imageBuffer));

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
