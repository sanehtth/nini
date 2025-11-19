(function () {
  const manifestStatusEl = document.getElementById("manifestStatus");
  const manifestOutputEl = document.getElementById("manifestOutput");
  const testNameInput = document.getElementById("testName");

  // ===== Helper =====
  function safeParseJson(text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      alert("JSON không hợp lệ, bạn kiểm tra lại nhé.\n\n" + e.message);
      throw e;
    }
  }

  function formatJson(obj) {
    return JSON.stringify(obj, null, 2);
  }

  function getPartFields(partIndex) {
    return {
      id: document.getElementById(`p${partIndex}-id`),
      title: document.getElementById(`p${partIndex}-title`),
      desc: document.getElementById(`p${partIndex}-desc`),
      json: document.getElementById(`p${partIndex}-json`),
      output: document.getElementById(`p${partIndex}-output`)
    };
  }

  // ===== Nút: Nạp sectionsManifest =====
  document.getElementById("btnLoadSectionsManifest")
    .addEventListener("click", async () => {
      try {
        const res = await fetch("/content/sectionsManifest.json", {
          cache: "no-cache"
        });
        if (!res.ok) {
          throw new Error("Không tìm thấy /content/sectionsManifest.json (status " + res.status + ")");
        }

        const data = await res.json();
        const sections = data.sections || [];

        // Tính ID lớn nhất cho từng phần P1..P6
        const maxByPart = {}; // { P1: 3, P2: 5, ... }
        sections.forEach((sec) => {
          const id = sec.id || "";
          const m = /^P(\d+)_(\d+)$/.exec(id);
          if (!m) return;
          const partKey = "P" + m[1];
          const num = parseInt(m[2], 10) || 0;
          if (!maxByPart[partKey] || num > maxByPart[partKey]) {
            maxByPart[partKey] = num;
          }
        });

        // Gợi ý ID tiếp theo cho 6 phần
        for (let i = 1; i <= 6; i++) {
          const input = document.getElementById(`p${i}-id`);
          if (!input) continue;

          const key = "P" + i;
          const currentMax = maxByPart[key] || 0;
          const nextNum = String(currentMax + 1).padStart(3, "0");
          if (!input.value) {
            input.value = `${key}_${nextNum}`;
          }
        }

        manifestStatusEl.textContent =
          `Đã nạp sectionsManifest: ${sections.length} sections (gợi ý ID tiếp theo cho P1–P6).`;
      } catch (err) {
        console.error(err);
        manifestStatusEl.textContent = "Lỗi khi nạp manifest.";
        alert(err.message);
      }
    });

  // ===== Nút: Tạo JSON từng phần (chỉ format) =====
  function wireMakeJson(partIndex) {
    const btn = document.getElementById(`btnMakeP${partIndex}`);
    if (!btn) return;

    btn.addEventListener("click", () => {
      const fields = getPartFields(partIndex);
      const raw = fields.json.value.trim();
      if (!raw) {
        alert(`Bạn chưa nhập JSON cho phần ${partIndex}.`);
        return;
      }
      try {
        const parsed = safeParseJson(raw);
        fields.output.value = formatJson(parsed);
      } catch {
        // safeParseJson đã alert rồi
      }
    });
  }

  for (let i = 1; i <= 6; i++) {
    wireMakeJson(i);
  }

  // ===== Nút: Tạo sectionsManifest =====
  document.getElementById("btnBuildSectionsManifest")
    .addEventListener("click", () => {
      const testName = testNameInput.value.trim() || "Test 1";

      // Map type cho 6 phần
      const typeByPart = {
        1: "mcqOneByOne",
        2: "mcqImage",
        3: "readingMcq",
        4: "readingDragDrop",
        5: "wordForm",
        6: "reorderAndRewrite"
      };

      const sections = [];
      for (let i = 1; i <= 6; i++) {
        const fields = getPartFields(i);
        const id = fields.id.value.trim();
        if (!id) continue; // phần nào chưa làm thì bỏ qua

        sections.push({
          id,
          testName,
          title: fields.title.value.trim() || `Part ${i}`,
          type: typeByPart[i],
          description: fields.desc.value.trim() || "",
          file: `/content/${testName}/${id}.json`
        });
      }

      const manifest = { sections };
      manifestOutputEl.value = formatJson(manifest);
      manifestStatusEl.textContent = "Đã tạo sectionsManifest (bản mới nằm trong ô JSON dưới).";
    });

  // ===== Nút: Tạo testsManifest (demo đơn giản) =====
  document.getElementById("btnBuildTestsManifest")
    .addEventListener("click", () => {
      const testName = testNameInput.value.trim() || "Test 1";
      const test = {
        id: testName.replace(/\s+/g, "_"),
        name: testName,
        // Ở đây chỉ demo: lấy tất cả section id đang có
        sections: []
      };

      for (let i = 1; i <= 6; i++) {
        const id = document.getElementById(`p${i}-id`).value.trim();
        if (id) test.sections.push(id);
      }

      const testsManifest = { tests: [test] };
      manifestOutputEl.value = formatJson(testsManifest);
      manifestStatusEl.textContent = "Đã tạo testsManifest (demo 1 test).";
    });

  // ===== Nút: Đồng bộ lên GitHub (khung sẵn) =====
  document.getElementById("btnSyncGithub")
    .addEventListener("click", async () => {
      // TODO: nối với API /api/github-sync nếu bạn đã tạo.
      // Hiện tại chỉ log ra để tránh lỗi.
      alert("Đồng bộ GitHub: phần này mình để khung sẵn.\nKhi bạn có API `/api/github-sync` mình sẽ giúp nối tiếp.");
    });

  // ===== Nút: Export toàn bộ (download 1 file .json) =====
  document.getElementById("btnExportAll")
    .addEventListener("click", () => {
      const exportData = {
        testName: testNameInput.value.trim() || "Test 1",
        parts: {}
      };

      for (let i = 1; i <= 6; i++) {
        const f = getPartFields(i);
        exportData.parts[`P${i}`] = {
          id: f.id.value.trim(),
          title: f.title.value.trim(),
          desc: f.desc.value.trim(),
          rawJson: f.json.value.trim()
        };
      }

      const blob = new Blob([formatJson(exportData)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "builder-export.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
})();
