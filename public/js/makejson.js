// js/makejson.js
// Builder 6 phần + 5 nút: nạp manifest, tạo sectionsManifest, tạo testsManifest,
// đồng bộ lên GitHub (gọi /api/updateSectionsManifest), xuất data local.

(function () {
  // ====== STATE ======
  let sectionsManifestLoaded = null;   // từ server (/content/sectionsManifest.json)
  let testsManifestLoaded = null;      // từ server (/content/testsManifest.json)

  let sectionsManifestLocal = null;    // bản mới sau khi bấm "Tạo sectionManifest"
  let testsManifestLocal = null;       // bản mới sau khi bấm "Tạo testsManifest"

  // JSON 6 phần (tạo bằng nút "Tạo JSON phần x")
  const partJson = {
    p1: null,
    p2: null,
    p3: null,
    p4: null,
    p5: null,
    p6: null,
  };

  // ====== HELPERS ======
  function $(id) {
    return document.getElementById(id);
  }

  function slugify(str) {
    return (str || "")
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 40);
  }

  function setStatus(text, type) {
    const el = $("manifestStatus");
    if (!el) return;
    el.textContent = text;
    el.style.color = type === "error" ? "#b91c1c" : type === "ok" ? "#16a34a" : "#6b7280";
  }

  function downloadFile(filename, content) {
    const blob = new Blob([content], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ====== TAB UI ======
  function setupTabs() {
    const tabs = document.querySelectorAll(".builder-tab");
    tabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        tabs.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        for (let i = 1; i <= 6; i++) {
          const sec = $("tab-p" + i);
          if (!sec) continue;
          sec.style.display = tab === "p" + i ? "block" : "none";
        }
      });
    });
  }

  // ====== 1. NẠP sectionsManifest/testsManifest ======
  async function loadSectionsManifest() {
    try {
      setStatus("Đang nạp sectionsManifest.json...", "");
      const secRes = await fetch("/content/sectionsManifest.json?_=" + Date.now());
      if (secRes.ok) {
        sectionsManifestLoaded = await secRes.json();
      } else {
        sectionsManifestLoaded = { sections: [] };
      }

      let testsCount = 0;
      try {
        const testsRes = await fetch("/content/testsManifest.json?_=" + Date.now());
        if (testsRes.ok) {
          testsManifestLoaded = await testsRes.json();
          testsCount = (testsManifestLoaded.tests || []).length;
        } else {
          testsManifestLoaded = { tests: [] };
        }
      } catch {
        testsManifestLoaded = { tests: [] };
      }

      const sectionCount = (sectionsManifestLoaded.sections || []).length;
      setStatus(
        `Đã nạp sectionsManifest (${sectionCount} section), testsManifest (${testsCount} test).`,
        "ok"
      );

      $("sectionsManifestOutput").value = JSON.stringify(
        sectionsManifestLoaded,
        null,
        2
      );
      $("testsManifestOutput").value = JSON.stringify(
        testsManifestLoaded,
        null,
        2
      );
    } catch (e) {
      console.error(e);
      setStatus("Lỗi khi nạp manifest: " + e.message, "error");
    }
  }

  // ====== 2. TẠO sectionsManifest (LOCAL) ======
  function buildSectionsManifest() {
    const testId = $("testId").value.trim() || "test1";
    const testName = $("testName").value.trim() || "Test 1";

    const base =
      sectionsManifestLoaded && Array.isArray(sectionsManifestLoaded.sections)
        ? JSON.parse(JSON.stringify(sectionsManifestLoaded))
        : { sections: [] };

    const sections = base.sections || [];

    // helper: push meta nếu có ID
    function addSection(partId, titleId, fileId, type) {
      const secId = $(partId).value.trim();
      const secTitle = $(titleId).value.trim();
      const secFile = $(fileId).value.trim();

      if (!secId) return;

      const filePath =
        secFile || `/content/${slugify(testId)}/${secId}.json`;

      sections.push({
        id: secId,
        title: secTitle || `${testName} - ${type}`,
        type,
        testName: testName,
        file: filePath,
      });
    }

    addSection("p1Id", "p1Title", "p1File", "mcqOneByOne");
    addSection("p2Id", "p2Title", "p2File", "mcqImage");
    addSection("p3Id", "p3Title", "p3File", "readingMcq");
    addSection("p4Id", "p4Title", "p4File", "readingDragDrop");
    addSection("p5Id", "p5Title", "p5File", "wordForm");
    addSection("p6Id", "p6Title", "p6File", "reorderAndRewrite");

    sectionsManifestLocal = { sections };
    $("sectionsManifestOutput").value = JSON.stringify(
      sectionsManifestLocal,
      null,
      2
    );
    setStatus("Đã tạo sectionsManifest (local). Chưa đẩy GitHub.", "ok");
  }

  // ====== 3. TẠO testsManifest (LOCAL) ======
  function buildTestsManifest() {
    const testId = $("testId").value.trim() || "test1";
    const testName = $("testName").value.trim() || "Test 1";
    const testTitle = $("testTitle").value.trim() || `${testName}`;
    const testDesc = $("testDesc").value.trim();

    const base =
      testsManifestLoaded && Array.isArray(testsManifestLoaded.tests)
        ? JSON.parse(JSON.stringify(testsManifestLoaded))
        : { tests: [] };

    const tests = base.tests || [];

    // gather section IDs
    const sectionIds = [
      $("p1Id").value.trim(),
      $("p2Id").value.trim(),
      $("p3Id").value.trim(),
      $("p4Id").value.trim(),
      $("p5Id").value.trim(),
      $("p6Id").value.trim(),
    ].filter(Boolean);

    // tìm test cũ cùng id → update, không phải push trùng
    let target = tests.find((t) => t.id === testId);
    if (!target) {
      target = {
        id: testId,
        title: testTitle,
        description: testDesc,
        sections: sectionIds,
      };
      tests.push(target);
    } else {
      target.title = testTitle;
      target.description = testDesc;
      target.sections = sectionIds;
    }

    testsManifestLocal = { tests };
    $("testsManifestOutput").value = JSON.stringify(
      testsManifestLocal,
      null,
      2
    );
    setStatus("Đã tạo testsManifest (local). Chưa đẩy GitHub.", "ok");
  }

  // ====== 4. ĐỒNG BỘ LÊN GITHUB (chỉ sectionsManifest) ======
  async function syncGithub() {
    if (!sectionsManifestLocal) {
      alert("Chưa có sectionsManifestLocal. Hãy bấm 'Tạo sectionManifest' trước.");
      return;
    }

    try {
      setStatus("Đang gửi sectionsManifest lên GitHub...", "");
      const res = await fetch("/api/updateSectionsManifest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: JSON.stringify(sectionsManifestLocal, null, 2),
          message: "Update sectionsManifest via makejson.html",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        console.error("syncGithub error:", data);
        setStatus("Lỗi đồng bộ GitHub (xem console).", "error");
        alert(
          "Lỗi khi cập nhật sectionsManifest lên GitHub.\n" +
            (data.error || res.status)
        );
        return;
      }

      setStatus("Đã cập nhật sectionsManifest lên GitHub!", "ok");
      alert("Đã cập nhật sectionsManifest.json lên GitHub ✅");
    } catch (e) {
      console.error(e);
      setStatus("Lỗi mạng khi gọi API.", "error");
      alert("Lỗi mạng khi gọi API /api/updateSectionsManifest.");
    }
  }

  // ====== 5. XUẤT DATA (LOCAL) ======
  function exportData() {
    const testId = $("testId").value.trim() || "test";
    const bundle = {
      testId,
      parts: partJson,
      sectionsManifest: sectionsManifestLocal,
      testsManifest: testsManifestLocal,
    };
    downloadFile(`${testId}_bundle.json`, JSON.stringify(bundle, null, 2));
  }

  // ====== BUILD JSON PHẦN 1–6 ======

  // P1: MCQ
  function parseAnswers(text) {
    const result = {};
    const lines = (text || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    lines.forEach((line) => {
      const m = line.match(/^(\d+)\s*[:\-]?\s*([A-D])/i);
      if (m) {
        result[m[1]] = m[2].toUpperCase();
      }
    });
    return result;
  }

  function buildP1() {
    const secId = $("p1Id").value.trim() || "P1_001";
    const secTitle =
      $("p1Title").value.trim() || "Phần 1 - Trắc nghiệm";
    const testName = $("testName").value.trim() || "Test 1";

    const raw = $("p1Raw").value || "";
    const answers = $("p1Answers").value || "";
    const out = $("p1JsonOutput");
    const statusEl = $("p1Status");

    const lines = raw.split(/\r?\n/);
    const questions = [];
    let i = 0;

    while (i < lines.length) {
      let line = lines[i].trim();
      if (!line) {
        i++;
        continue;
      }
      const m = line.match(/^Câu\s+(\d+)\.\s*(.+)$/i);
      if (!m) {
        i++;
        continue;
      }
      const number = parseInt(m[1], 10);
      const text = m[2].trim();

      const opts = [];
      for (let k = 0; k < 4 && i + 1 + k < lines.length; k++) {
        const optLine = lines[i + 1 + k].trim();
        const mo = optLine.match(/^([A-D])\.\s*(.+)$/i);
        if (mo) {
          opts.push(mo[2].trim());
        }
      }
      i += 1 + opts.length;
      if (opts.length < 2) continue;

      questions.push({ number, text, options: opts });
    }

    const ansMap = parseAnswers(answers);
    questions.forEach((q) => {
      const letter = ansMap[String(q.number)];
      if (!letter) return;
      const idxMap = { A: 0, B: 1, C: 2, D: 3 };
      const idx = idxMap[letter.toUpperCase()];
      if (idx != null) q.correct = idx;
    });

    const sectionJson = {
      id: secId,
      type: "mcqOneByOne",
      title: secTitle,
      testName,
      questions,
    };

    partJson.p1 = sectionJson;
    out.value = JSON.stringify(sectionJson, null, 2);
    statusEl.textContent = `Đã tạo JSON (${questions.length} câu).`;
  }

  // P2: thô
  function buildP2() {
    const secId = $("p2Id").value.trim() || "P2_001";
    const secTitle =
      $("p2Title").value.trim() || "Phần 2 - MCQ + hình";
    const testName = $("testName").value.trim() || "Test 1";

    const note = $("p2Raw").value || "";
    const obj = {
      id: secId,
      type: "mcqImage",
      title: secTitle,
      testName,
      note,
      questions: [],
    };
    partJson.p2 = obj;
    $("p2JsonOutput").value = JSON.stringify(obj, null, 2);
    $("p2Status").textContent = "Đã tạo JSON (thô).";
  }

  // P3: thô
  function buildP3() {
    const secId = $("p3Id").value.trim() || "P3_001";
    const secTitle =
      $("p3Title").value.trim() || "Phần 3 - Reading";
    const testName = $("testName").value.trim() || "Test 1";

    const passage = $("p3Passage").value || "";
    const note = $("p3Note").value || "";

    const obj = {
      id: secId,
      type: "readingMcq",
      title: secTitle,
      testName,
      passage,
      note,
      questions: [],
    };
    partJson.p3 = obj;
    $("p3JsonOutput").value = JSON.stringify(obj, null, 2);
    $("p3Status").textContent = "Đã tạo JSON (thô).";
  }

  // P4: dragdrop
  function buildP4() {
    const secId = $("p4Id").value.trim() || "P4_001";
    const secTitle =
      $("p4Title").value.trim() || "Phần 4 - Điền từ";
    const testName = $("testName").value.trim() || "Test 1";

    const passage = $("p4Passage").value || "";
    const wb = $("p4Wordbank").value || "";
    const blanksRaw = $("p4Blanks").value || "";

    const wordBank = wb
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const blanks = {};
    blanksRaw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .forEach((line) => {
        const m = line.match(/^(\d+)\s*[:\-]?\s*(.+)$/);
        if (m) blanks[m[1]] = m[2].trim();
      });

    const obj = {
      id: secId,
      type: "readingDragDrop",
      title: secTitle,
      testName,
      passage,
      wordBank,
      blanks,
    };
    partJson.p4 = obj;
    $("p4JsonOutput").value = JSON.stringify(obj, null, 2);
    $("p4Status").textContent = "Đã tạo JSON.";
  }

  // P5: wordForm
  function buildP5() {
    const secId = $("p5Id").value.trim() || "P5_001";
    const secTitle =
      $("p5Title").value.trim() || "Phần 5 - Word form";
    const testName = $("testName").value.trim() || "Test 1";

    const raw = $("p5Raw").value || "";
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const questions = lines.map((line, idx) => {
      const parts = line.split("|");
      return {
        number: idx + 1,
        raw: (parts[0] || "").trim(),
        answer: (parts[1] || "").trim(),
      };
    });

    const obj = {
      id: secId,
      type: "wordForm",
      title: secTitle,
      testName,
      questions,
    };
    partJson.p5 = obj;
    $("p5JsonOutput").value = JSON.stringify(obj, null, 2);
    $("p5Status").textContent = `Đã tạo JSON (${questions.length} câu).`;
  }

  // P6: reorder / rewrite
  function buildP6() {
    const secId = $("p6Id").value.trim() || "P6_001";
    const secTitle =
      $("p6Title").value.trim() || "Phần 6 - Viết lại câu";
    const testName = $("testName").value.trim() || "Test 1";

    const raw = $("p6Raw").value || "";
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const questions = lines.map((line, idx) => {
      const parts = line.split("|");
      return {
        number: idx + 1,
        prompt: (parts[0] || "").trim(),
        answer: (parts[1] || "").trim(),
      };
    });

    const obj = {
      id: secId,
      type: "reorderAndRewrite",
      title: secTitle,
      testName,
      questions,
    };
    partJson.p6 = obj;
    $("p6JsonOutput").value = JSON.stringify(obj, null, 2);
    $("p6Status").textContent = `Đã tạo JSON (${questions.length} câu).`;
  }

  // ====== EVENT BINDING ======
  document.addEventListener("DOMContentLoaded", () => {
    // back
    $("btnBackHome")?.addEventListener("click", () => {
      window.location.href = "/index.html";
    });

    setupTabs();

    // 5 nút trên
    $("btnLoadSectionsManifest")?.addEventListener("click", loadSectionsManifest);
    $("btnBuildSectionsManifest")?.addEventListener("click", buildSectionsManifest);
    $("btnBuildTestsManifest")?.addEventListener("click", buildTestsManifest);
    $("btnSyncGithub")?.addEventListener("click", syncGithub);
    $("btnExportData")?.addEventListener("click", exportData);

    // 6 nút tạo JSON phần
    $("btnBuildP1")?.addEventListener("click", buildP1);
    $("btnBuildP2")?.addEventListener("click", buildP2);
    $("btnBuildP3")?.addEventListener("click", buildP3);
    $("btnBuildP4")?.addEventListener("click", buildP4);
    $("btnBuildP5")?.addEventListener("click", buildP5);
    $("btnBuildP6")?.addEventListener("click", buildP6);
  });
})();
