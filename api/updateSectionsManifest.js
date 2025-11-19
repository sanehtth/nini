// api/updateSectionsManifest.js
// Vercel Serverless Function: cập nhật sectionsManifest.json trên GitHub

const OWNER = "sanehtth";        // tài khoản GitHub
const REPO  = "nini";            // tên repo
const BRANCH = "main";           // nhánh chính

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return res.status(500).json({ error: "Missing GITHUB_TOKEN on server" });
    }

    const { path, contentJson, message } = req.body || {};
    if (!path || !contentJson) {
      return res.status(400).json({ error: "Missing path or contentJson" });
    }

    // 1) Lấy file hiện tại để biết sha
    const apiBase = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}`;

    const getResp = await fetch(`${apiBase}?ref=${BRANCH}`);
    let sha = undefined;

    if (getResp.status === 200) {
      const fileInfo = await getResp.json();
      sha = fileInfo.sha;
    } else if (getResp.status !== 404) {
      const txt = await getResp.text();
      return res.status(500).json({ error: "Fail to read file", detail: txt });
    }

    // 2) Encode nội dung mới -> base64
    const contentStr = typeof contentJson === "string"
      ? contentJson
      : JSON.stringify(contentJson, null, 2);

    const base64 = Buffer.from(contentStr, "utf8").toString("base64");

    // 3) Gọi GitHub API để cập nhật
    const putResp = await fetch(apiBase, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: message || "Update sectionsManifest via makejson tool",
        content: base64,
        sha,
        branch: BRANCH,
      }),
    });

    if (!putResp.ok) {
      const txt = await putResp.text();
      return res.status(500).json({ error: "GitHub update failed", detail: txt });
    }

    const data = await putResp.json();
    return res.status(200).json({ ok: true, commit: data.commit && data.commit.sha });

  } catch (err) {
    console.error("updateSectionsManifest error", err);
    return res.status(500).json({ error: "Server error", detail: String(err) });
  }
}
