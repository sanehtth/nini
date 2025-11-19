// makejson.js
// Trang builder JSON & manifest cho NINI
// Không tham chiếu tới phần tử không tồn tại → không còn lỗi addEventListener null.

(function () {
  // ===== Utils DOM =====
  function $(id) {
    return document.getElementById(id);
  }

  function bind(id, handler) {
    const el = $(id);
    if (el) el.addEventListener("click", handler);
  }

  function toast(msg) {
    alert(msg); // đơn giản cho dễ; có thể thay bằng toast đẹp hơn
  }

  function safeParseJson(text, ctxLabel) {
    if (!text.trim()) return null;
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("JSON parse error in", ctxLabel, e);
      toast("JSON không hợp lệ ở " + ctxLabel + ". Vui lòng kiểm tra cú pháp.");
      throw e;
    }
  }

  // ===== Model section meta =====
  const SECTION_META = [
    { idx: 1, defaultType: "mcqOneByOne", label: "Vocabulary" },
    { idx: 2, defaultType: "mcqImage", label: "Grammar" },
    { idx: 3, defaultType: "mcqReading", label: "Reading" },
    { idx: 4, defaultType: "dragDrop", label: "Drag & Drop" },
    { idx: 5, defaultType: "wordForm", label: "Word form" },
    { idx: 6, defaultType: "reorderRewrite", label: "Reorder / Rewrite" }
  ];

  function getSectionData(i, options) {
    const opt = options || {};
    const id = $(`sec${i}Id`)?.value.trim() || "";
    const type = $(`sec${i}Type`)?.value.trim() || "";
    const title = $(`sec${i}Title`)?.value.trim() || "";
    const description = $(`sec${i}Desc`)?.value.trim() || "";
    const contentRaw = $(`sec${i}Content`)?.value || "";

    let content = null;
    if (opt.parseContent !== false) {
      content = safeParseJson(contentRaw, `Phần ${i}`);
    }

    return {
      part: i,
      id,
      type,
      title,
      description,
      content
    };
  }

  function collectAllSections(parseContent = true) {
    return SECTION_META.map((m) => getSectionData(m.idx, { parseContent }));
  }

  // state lưu tạm để xuất / sync
  let currentSectionsManifest = null;
  let currentTestsManifest = null;

  // ====== Tạo JSON cho 1 phần ======
  function handleCreateJsonForPart(partIdx) {
    const sec = getSectionData(partIdx, { parseContent: true });
    const outEl = $(`sec${partIdx}Output`);
    if (!outEl) return;

    // Giữ nguyên cấu trúc content mà bạn nhập – mình chỉ pretty-print lại
    const pretty = JSON.stringify(sec.content, null, 2);
    outEl.value = pretty;
    toast("Đã tạo JSON cho phần " + partIdx);
  }

  // ====== Tạo sectionsManifest từ 6 phần ======
  function createSectionsManifest() {
    const testName = $("testName")?.value.trim();
    if (!testName) {
      toast("Vui lòng nhập TÊN BÀI TEST (testName) trước.");
      return;
    }

    const sections = collectAllSections(false); // không cần parse content ở đây
    const manifest = sections.map((s) => ({
      testName,
      part: s.part,
      id: s.id,
      type: s.type,
      title: s.title,
      description: s.description || ""
    }));

    currentSectionsManifest = manifest;
    $("statusBar").textContent =
      "Đã tạo sectionsManifest trong bộ nhớ (chưa ghi file).";
    toast("Đã tạo sectionsManifest cho " + testName);
    console.log("[sectionsManifest]", manifest);
  }

  // ====== Tạo testsManifest đơn giản từ sectionsManifest ======
  function createTestsManifest() {
    const testName = $("testName")?.value.trim();
    if (!testName) {
      toast("Vui lòng nhập testName trước.");
      return;
    }
    if (!currentSectionsManifest) {
      toast("Hãy tạo sectionsManifest trước đã.");
      return;
    }

    const entry = {
      name: testName,
      sections: currentSectionsManifest.map((s) => ({
        part: s.part,
        id: s.id,
        type: s.type
      }))
    };

    currentTestsManifest = { tests: [entry] };
    $("statusBar").textContent =
      "Đã tạo testsManifest trong bộ nhớ (chưa ghi file).";
    toast("Đã tạo testsManifest cho " + testName);
    console.log("[testsManifest]", currentTestsManifest);
  }

  // ====== Nạp sectionsManifest từ file JSON local ======
  // Ý tưởng: click Nạp sectionsManifest → chọn file → auto điền ID / type / title nếu tìm được
  function loadSectionsManifestFromFile() {
    const fileInput = $("sectionsManifestFile");
    if (!fileInput) {
      toast("Không tìm thấy input file sectionsManifestFile.");
      return;
    }

    fileInput.value = "";
    fileInput.onchange = () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const json = JSON.parse(text);
          applySectionsManifest(json);
        } catch (err) {
          console.error(err);
          toast("Không đọc được JSON từ file sectionsManifest.");
        }
      };
      reader.readAsText(file, "utf-8");
    };

    fileInput.click();
  }

  function applySectionsManifest(json) {
    const testName = $("testName")?.value.trim();
    if (!testName) {
      toast(
        "Bạn nên nhập testName trước, để mình lọc đúng các section trong manifest."
      );
    }

    let list = [];
    if (Array.isArray(json)) {
      list = json;
    } else if (Array.isArray(json.sections)) {
      list = json.sections;
    } else {
      toast("Định dạng sectionsManifest không đúng (không phải mảng).");
      return;
    }

    const filtered = testName
      ? list.filter((s) => s.testName === testName)
      : list;

    SECTION_META.forEach((meta, idx0) => {
      const i = meta.idx;
      // ưu tiên cột part, không có thì lấy theo thứ tự
      let matched =
        filtered.find(
          (s) =>
            s.part === i ||
            s.sectionIndex === i ||
            s.order === i ||
            s.partIndex === i
        ) || filtered[idx0];

      if (!matched) return;

      if ($(`sec${i}Id`)) $(`sec${i}Id`).value = matched.id || "";
      if ($(`sec${i}Type`))
        $(`sec${i}Type`).value = matched.type || meta.defaultType;
      if ($(`sec${i}Title`)) $(`sec${i}Title`).value = matched.title || "";
      if ($(`sec${i}Desc`))
        $(`sec${i}Desc`).value = matched.description || "";
    });

    $("statusBar").textContent =
      "Đã nạp sectionsManifest từ file (điền lại ID / type / title nếu tìm thấy).";
    toast("Đã nạp sectionsManifest từ file.");
  }

  // ====== Đồng bộ lên GitHub (qua API Vercel) ======
  // Backend bạn tự tạo function, ví dụ: /api/sync-english-content
  // Nhớ dùng env: GIFHUB_TOKEN, GIFHUB_REPO, GIFHUB_FILE_PATH
  async function syncGithub() {
    const testName = $("testName")?.value.trim();
    if (!testName) {
      toast("Vui lòng nhập testName trước.");
      return;
    }

    const sections = collectAllSections(true);

    if (!currentSectionsManifest) {
      createSectionsManifest();
    }
    if (!currentTestsManifest) {
      createTestsManifest();
    }

    const payload = {
      testName,
      sections,
      sectionsManifest: currentSectionsManifest,
      testsManifest: currentTestsManifest
    };

    $("statusBar").textContent = "Đang gửi dữ liệu lên API Vercel...";

    try {
      const res = await fetch("/api/sync-english-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error("HTTP " + res.status + ": " + text);
      }

      const data = await res.json().catch(() => ({}));
      console.log("[sync result]", data);
      $("statusBar").textContent = "Đã đồng bộ với GitHub thành công (theo API).";
      toast("Đã đồng bộ với GitHub (nếu API setup đúng).");
    } catch (err) {
      console.error(err);
      $("statusBar").textContent =
        "Lỗi khi gọi API đồng bộ GitHub. Xem console để debug.";
      toast("Không gọi được API đồng bộ GitHub. Kiểm tra lại Vercel/API nhé.");
    }
  }

  // ====== Xuất toàn bộ dữ liệu (tải về file .json) ======
  function exportAllData() {
    const testName = $("testName")?.value.trim() || "untitled-test";
    const sections = collectAllSections(true);

    const data = {
      testName,
      sections,
      sectionsManifest: currentSectionsManifest,
      testsManifest: currentTestsManifest
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${testName.replace(/\s+/g, "_")}_all.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast("Đã xuất toàn bộ dữ liệu JSON.");
  }

  // ====== Gắn sự kiện ======
  document.addEventListener("DOMContentLoaded", () => {
    // 6 nút tạo JSON
    SECTION_META.forEach((meta) => {
      bind("btnCreateJson" + meta.idx, () =>
        handleCreateJsonForPart(meta.idx)
      );
    });

    // 5 nút trên header
    bind("btnLoadSectionsManifest", loadSectionsManifestFromFile);
    bind("btnCreateSectionsManifest", createSectionsManifest);
    bind("btnCreateTestsManifest", createTestsManifest);
    bind("btnSyncGithub", syncGithub);
    bind("btnExportAll", exportAllData);

    // Nếu quên tạo nút nào thì cũng KHÔNG bị lỗi JS, vì bind đã kiểm tra null
    console.log("[makejson] init ok");
  });
})();
