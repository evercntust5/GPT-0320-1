module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.statusCode = 500;
      return res.json({ error: "Missing OPENAI_API_KEY" });
    }

    const body = req.body || {};
    const audioB64 = body.audio_base64;
    const mimeType = body.mime_type || "audio/webm";

    if (!audioB64 || typeof audioB64 !== "string") {
      res.statusCode = 400;
      return res.json({ error: "audio_base64 is required" });
    }

    // Models: whisper-1, gpt-4o-transcribe, gpt-4o-mini-transcribe, ...
    const model = process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";

    const buffer = Buffer.from(audioB64, "base64");

    const fd = new FormData();
    const ext =
      mimeType.includes("mp4") ? "mp4" :
      mimeType.includes("m4a") ? "m4a" :
      mimeType.includes("wav") ? "wav" : "webm";

    const file = new Blob([buffer], { type: mimeType });
    fd.append("file", file, `audio.${ext}`);
    fd.append("model", model);
    // For gpt-4o-transcribe & gpt-4o-mini-transcribe, response_format supports json
    fd.append("response_format", "json");
    fd.append("language", "zh");

    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: fd
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      res.statusCode = r.status;
      return res.json({ error: data?.error?.message || "OpenAI transcription failed", raw: data });
    }

    return res.json({ text: data.text || "" });
  } catch (e) {
    res.statusCode = 500;
    return res.json({ error: e.message || "Server error" });
  }
};
