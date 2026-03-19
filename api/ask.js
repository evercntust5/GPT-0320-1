export default async function handler(req, res) {
  // 只接受 POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { question, context } = req.body || {};

    if (!question || !question.trim()) {
      return res.status(400).json({ error: "question is required" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    // 你可在 Vercel 環境變數設定 OPENAI_MODEL；沒設就用預設值
    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

    const prompt = [
     "你是園藝植物辨識學習系統中的虛擬助教，服務對象是高職學生。",
     "請一律使用繁體中文，直接回答，不要寒暄。",
     "回答要像老師在現場快速提示辨識重點。",
     "回答規則：",
     "1. 若學生問兩種植物差異，只回答最重要的 2 到 3 個辨識重點。",
     "2. 以短句回答，每句不要太長。",
     "3. 總長控制在 3 句內，120~220 字左右。",
     "4. 不要條列，不要編號，不要 markdown 符號。",
     "5. 優先回答學生現場看得到的特徵，例如葉形、葉片粗細、枝條、樹形。",
      context ? `目前單元脈絡：${context}` : "",
      `學生問題：${question}`
    ].filter(Boolean).join("\n");

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input: prompt
      })
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({
        error: data?.error?.message || "OpenAI request failed",
        raw: data
      });
    }

    // 盡量兼容不同回傳形狀
    let answer = data.output_text || "";

    if (!answer && Array.isArray(data.output)) {
      answer = data.output
        .flatMap(item => item.content || [])
        .filter(c => c.type === "output_text" || c.type === "text")
        .map(c => c.text || "")
        .join("\n")
        .trim();
    }

    return res.status(200).json({
      answer: answer || "（模型已回應，但沒有可顯示文字）"
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || "Server error"
    });
  }

}
