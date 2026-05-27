import formidable from 'formidable';
import fs from 'fs';
import FormData from 'form-data';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const form = formidable({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Failed to parse form' });

    const file = files.file?.[0] || files.file;
    if (!file) return res.status(400).json({ error: 'No audio file provided' });

    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(file.filepath), {
        filename: 'recording.webm',
        contentType: 'audio/webm',
      });
      formData.append('model_id', 'scribe_v1');

      const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.VITE_ELEVENLABS_API_KEY,
          ...formData.getHeaders(),
        },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.text();
        return res.status(response.status).json({ error: err });
      }

      const data = await response.json();
      res.json({ text: data.text || '' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}
