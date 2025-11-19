// makejson.js
// Logic cho 6 phần + nạp / build manifest

const LOAD_MANIFEST_URL = "/content/sectionsManifest.json";
// Nếu sau này có API GitHub, bạn có thể dùng: const LOAD_MANIFEST_URL = "/api/load-sections-manifest";

let currentSectionsManifest = [];

// ===== Utils chung =====
function $(id) {
  return document.getElementById(id);
}

function showToast(msg) {
  // dùng alert đơn giản cho dễ debug
  alert(msg);
}

// Lấy text từ 6 form phần
function collectPartData() {
  return [
    {
      part: 1,
      id: $("#part1Id").value.trim(),
      title: $("#part1Title").value.trim(),
      desc: $("#part1Desc").value.trim(),
      jsonText: $("#part1Json").value.trim()
    },
    {
      part: 2,
      id: $("#part2Id").value.trim(),
      title: $("#part2Title").value.trim(),
      desc: $("#part2Desc").value.trim(),
      jsonText: $("#part2Json").value.trim()
    },
    {
      part: 3,
      id: $("#part3Id").value.trim(),
      title: $("#part3Title").value.trim(),
      desc: $("#part3Desc").value.trim(),
      jsonText: $("#part3Json").value.trim()
    },
    {
      part: 4,
      id: $("#part4Id").value.trim(),
      title: $("#part4Title").value.trim(),
      desc: $("#part4Desc").value.trim(),
      jsonText: $("#part4Json").value.trim()
    },
    {
      part: 5,
      id: $("#part5Id").value.trim(),
      title: $("#part5Title").value.trim(),
      desc: $("#part5Desc").value.trim(),
      jsonText: $("#part5Json").value.trim()
    },
    {
      part: 6,
      id: $("#part6Id").value.trim(),
      title: $("#part6Title").value.trim(),
      desc: $("#part6Desc").value.trim(),
      jsonText: $("#part6Json").value.trim()
    }
  ];
}

// ===== 1. NẠP sectionsManifest & TỰ NHẢY ID =====
async function loadSectionsManifest() {
  const info = $("#manifestInfo");
  info.textContent = "Đang nạp manifest...";
  try {
    const res = await fetch(LOAD_MANIFEST_URL, { cache: "no-store" });
    if (!res.ok) {
      throw new Error("HTTP " + res.status);
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error("sectionsManifest.json phải là mảng JSON");
    }
    currentSectionsManifest = data;

    const testName = $("#testName").value.trim();
    // Nếu có testName -> chỉ xét những section của test đó
    const filtered = testName
      ? data.filter((s) => (s.testName || "").trim() === testName)
      : data;

    // Tính ID lớn nhất cho mỗi part P1..P6
    const maxByPart = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    filtered.forEach((sec) => {
      const id = (sec.id || "").toUpperCase(); // ví dụ: "P1_003"
      const m = /^P([1-6])_(\d+)$/.exec(id);
      if (!m) return;
      const part = Number(m[1]);
      const num = Number(m[2]);
      if (!Number.isFinite(num)) return;
      if (num > maxByPart[part]) maxByPart[part] = num;
    });

    // Gán ID mới cho 6 input
    for (let part = 1; part <= 6; part++) {
      const nextNum = maxByPart[part] + 1;
      const nextId = `P${part}_` + String(nextNum).padStart(3, "0");
      const input = $(`part${part}Id`);
      if (input && !input.value) {
        input.value = nextId;
      }
    }

    info.textContent = `Đã nạp manifest: ${
      data.length
    } section (filter theo testName: ${
      testName || "tất cả"
    }). Đã auto điền ID nếu trống.`;
  } catch (err) {
    console.error(err);
    info.textContent = "Lỗi khi nạp manifest. Xem console.";
    showToast("Không nạp được sectionsManifest. Kiểm tra đường dẫn /content/sectionsManifest.json nhé.");
  }
}

// ===== 2. Tạo JSON từng phần =====
function bindPartButtons() {
  const map = [
    { btn: "btnGenPart1", input: "part1Json", out: "part1Output" },
    { btn: "btnGenPart2", input: "part2Json", out: "part2Output" },
    { btn: "btnGenPart3", input: "part3Json", out: "part3Output" },
    { btn: "btnGenPart4", input: "part4Json", out: "part4Output" },
    { btn: "btnGenPart5", input: "part5Json", out: "part5Output" },
    { btn: "btnGenPart6", input: "part6Json", out: "part6Output" }
  ];

  map.forEach((cfg) => {
    const btn = $(cfg.btn);
    if (!btn) return;
    btn.addEventListener("click", () => {
      const raw = $(cfg.input).value.trim();
      if (!raw) {
        showToast("Bạn chưa nhập nội dung JSON phần này.");
        return;
      }
      try {
        // Thử parse để đảm bảo JSON hợp lệ, rồi format đẹp
        const parsed = JSON.parse(raw);
        $(cfg.out).value = JSON.stringify(parsed, null, 2);
        showToast("Đã format JSON cho phần này.");
      } catch (err) {
        console.error(err);
        showToast("JSON không hợp lệ. Hãy kiểm tra dấu phẩy, ngoặc, ...");
      }
    });
  });
}

// ===== 3. Tạo sectionsManifest từ form hiện tại =====
function buildSectionsManifestFromForm() {
  const testName = $("#testName").value.trim();
  if (!testName) {
    showToast("Nhập testName trước khi tạo sectionsManifest.");
    return;
  }
  const parts = collectPartData();

  const sections = [];
  parts.forEach((p) => {
    if (!p.id || !p.jsonText) return; // bỏ qua phần trống
    sections.push({
      id: p.id,
      title: p.title || `Part ${p.part}`,
      description: p.desc || "",
      testName,
      partIndex: p.part,
      // type chỉ ví dụ: bạn có thể chỉnh cho đúng tùy part
      type:
        p.part === 1
          ? "mcqOneByOne"
          : p.part === 2
          ? "mcqImage"
          : p.part === 3
          ? "readingMcq"
          : p.part === 4
          ? "readingDragDrop"
          : p.part === 5
          ? "wordForm"
          : "reorderAndRewrite",
      // đường dẫn file JSON đề xuất
      file: `/content/${testName.replace(/\s+/g, "_")}_${p.id}.json`
    });
  });

  if (sections.length === 0) {
    showToast("Không có phần nào có ID + JSON để tạo manifest.");
    return;
  }

  // Ghép với manifest cũ, bạn có thể tùy ý logic merge (ở đây chỉ log ra)
  console.log("sectionsManifest mới (chưa ghi ra file):", sections);
  showToast("Đã build xong sectionsManifest (xem console). Khi có API, ta sẽ gửi lên GitHub.");
}

// ===== 4. Tạo testsManifest (đơn giản) =====
function buildTestsManifest() {
  const testName = $("#testName").value.trim();
  if (!testName) {
    showToast("Nhập testName trước khi tạo testsManifest.");
    return;
  }
  const parts = collectPartData().filter((p) => p.id);
  const testId = testName.replace(/\s+/g, "_");

  const testObj = {
    id: testId,
    title: testName,
    sections: parts.map((p) => p.id)
  };

  console.log("testsManifest entry cho test này:", testObj);
  showToast("Đã build testsManifest entry (xem console).");
}

// ===== 5. Đồng bộ GitHub (stub – cần API backend) =====
async function syncToGithub() {
  showToast(
    "Stub: Ở bước này cần một API backend để ghi files lên GitHub. Hiện mình chỉ log dữ liệu ra console."
  );
  const parts = collectPartData();
  console.log("Dữ liệu tất cả phần:", parts);
}

// ===== 6. Xuất toàn bộ (download JSON) =====
function exportAll() {
  const testName = $("#testName").value.trim() || "untitled-test";
  const payload = {
    testName,
    sections: collectPartData(),
    sectionsManifest: currentSectionsManifest
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${testName.replace(/\s+/g, "_")}_builder_export.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ===== BIND SỰ KIỆN =====
document.addEventListener("DOMContentLoaded", () => {
  $("#btnLoadManifest").addEventListener("click", loadSectionsManifest);
  $("#btnBuildSectionsManifest").addEventListener(
    "click",
    buildSectionsManifestFromForm
  );
  $("#btnBuildTestsManifest").addEventListener("click", buildTestsManifest);
  $("#btnSyncGithub").addEventListener("click", syncToGithub);
  $("#btnExportAll").addEventListener("click", exportAll);

  bindPartButtons();
});
