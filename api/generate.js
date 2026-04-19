export default async function handler(req, res) {
  const { prompt } = req.body;
  const HF_TOKEN = process.env.HF_TOKEN; // Vercel env variable

  const response = await fetch(
    'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputs: prompt })
    }
  );

  const buffer = await response.arrayBuffer();
  res.setHeader('Content-Type', 'image/png');
  res.send(Buffer.from(buffer));
}
