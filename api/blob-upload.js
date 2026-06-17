// Gera o token pro upload client-side direto no Vercel Blob (sem passar bytes pela funcao).
// A senha (se houver) vem no clientPayload — nao da pra usar header aqui porque o Blob
// tambem chama esta funcao no onUploadCompleted (sem nossos headers).
import { handleUpload } from '@vercel/blob/client';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const json = await handleUpload({
      request: req,
      body: req.body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const need = process.env.APP_PASSWORD;
        if (need && clientPayload !== need) throw new Error('senha incorreta');
        return {
          allowedContentTypes: ['video/mp4', 'video/quicktime', 'application/octet-stream'],
          maximumSizeInBytes: 1024 * 1024 * 1024, // 1 GB por video
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {},
    });
    return res.status(200).json(json);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}
