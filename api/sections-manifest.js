// api/sections-manifest.js
export default async function handler(req, res) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;           // vd: "sanehtth/nini"
  const filePath = process.env.GITHUB_FILE_PATH;  // vd: "public/quiz/sectionsManifest.json"

  if (!token || !repo || !filePath) {
    res.status(500).json({ error: "Missing GitHub env vars" });
    return;
  }

  const apiUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github+json",
    "User-Agent": "nini-json-builder"
  };

  try {
    if (req.method === "GET") {
      // Lấy nội dung file hiện tại
      const r = await fetch(apiUrl, { headers });
      if (!r.ok) {
        const text = await r.text();
        res.status(r.status).json({ error: "GitHub GET failed", detail: text });
        return;
      }
      const json = await r.json();
      const decoded = Buffer.from(json.content, "base64").toString("utf8");
      res.status(200).json({ content: decoded, sha: json.sha });
      return;
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body;
      const { content, message } = body || {};

      if (!content) {
        res.status(400).json({ error: "Missing content" });
        return;
      }

      // Lấy SHA hiện tại của file để PUT
      const rGet = await fetch(apiUrl, { headers });
      if (!rGet.ok) {
        const text = await rGet.text();
        res.status(rGet.status).json({ error: "GitHub GET before PUT failed", detail: text });
        return;
      }
      const meta = await rGet.json();

      const encoded = Buffer.from(content, "utf8").toString("base64");
      const rPut = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: message || "Update sectionsManifest.json via builder",
          content: encoded,
          sha: meta.sha
        })
      });

      if (!rPut.ok) {
        const text = await rPut.text();
        res.status(rPut.status).json({ error: "GitHub PUT failed", detail: text });
        return;
      }

      const result = await rPut.json();
      res.status(200).json({ ok: true, commit: result.commit?.sha });
      return;
    }

    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end("Method Not Allowed");
  } catch (err) {
    console.error("[sections-manifest]", err);
    res.status(500).json({ error: "Server error", detail: String(err) });
  }
}
