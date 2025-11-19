// api/updateSectionsManifest.js
// Vercel serverless function – cập nhật 1 file sectionsManifest.json trên GitHub
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = process.env.GIFHUB_TOKEN;
    const repo = process.env.GIFHUB_REPO;            // vd: "sanehtth/nini"
    const filePath = process.env.GIFHUB_FILE_PATH;   // vd: "public/content/sectionsManifest.json"

    if (!token || !repo || !filePath) {
      return res.status(500).json({ error: "Missing GIFHUB_* env vars" });
    }

    const { content, message } = req.body || {};

    if (!content) {
      return res.status(400).json({ error: "Missing content in body" });
    }

    const [owner, repoName] = repo.split("/");
    const apiBase = "https://api.github.com";
    const url = `${apiBase}/repos/${owner}/${repoName}/contents/${filePath}`;

    const headers = {
      Authorization: `token ${token}`,
      "User-Agent": "nini-vercel-fn",
      Accept: "application/vnd.github+json",
    };

    // 1) Lấy sha hiện tại (nếu file đã tồn tại)
    let sha = undefined;
    const getResp = await fetch(url, { headers });

    if (getResp.status === 200) {
      const data = await getResp.json();
      sha = data.sha;
    } else if (getResp.status !== 404) {
      const txt = await getResp.text();
      return res
        .status(500)
        .json({ error: "GitHub GET failed", status: getResp.status, body: txt });
    }

    // 2) PUT nội dung mới (base64-encoded)
    const encoded = Buffer.from(content, "utf8").toString("base64");

    const putBody = {
      message: message || "Update sectionsManifest.json from builder",
      content: encoded,
    };
    if (sha) putBody.sha = sha;

    const putResp = await fetch(url, {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(putBody),
    });

    const putJson = await putResp.json();

    if (!putResp.ok) {
      return res
        .status(500)
        .json({ error: "GitHub PUT failed", status: putResp.status, body: putJson });
    }

    return res.status(200).json({
      ok: true,
      path: filePath,
      commit: putJson.commit?.sha || null,
    });
  } catch (e) {
    console.error("[updateSectionsManifest] error", e);
    return res.status(500).json({ error: e.message || "Unknown error" });
  }
}
