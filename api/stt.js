export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { audio, mimeType = 'audio/webm' } = req.body;

    if (!audio) return res.status(400).json({ error: 'No audio provided' });

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audio, 'base64');
    const blob = new Blob([audioBuffer], { type: mimeType });

    const formData = new FormData();
    formData.append('file', blob, 'recording.webm');
    formData.append('model_id', 'scribe_v1');

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.VITE_ELEVENLABS_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    res.status(200).json({ text: data.text || '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
