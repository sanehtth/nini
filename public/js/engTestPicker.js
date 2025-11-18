// public/js/engTestPicker.js
// Load danh sách test tiếng Anh từ testsManifest.json
// và điều hướng sang quizEng.html?test=...

(function () {
  async function initEngTestPicker() {
    const select = document.getElementById("engTestSelect");
    const btn = document.getElementById("startEngTestBtn");
    const desc = document.getElementById("engTestDesc");
    if (!select || !btn) return; // nếu index không có khung này thì bỏ qua

    // reset giao diện
    select.innerHTML = '<option value="">Đang tải danh sách bài test...</option>';
    if (desc) desc.textContent = "";

    try {
      const res = await fetch("/content/testsManifest.json");
      if (!res.ok) throw new Error("Không tải được testsManifest.json");
      const data = await res.json();

      if (!data.tests || !data.tests.length) {
        select.innerHTML = '<option value="">(Chưa có bài test nào)</option>';
        return;
      }

      // Xoá option loading
      select.innerHTML = "";

      data.tests.forEach((test, idx) => {
        const opt = document.createElement("option");
        opt.value = test.id;
        opt.textContent = test.title || ("Test " + (idx + 1));
        if (test.description) {
          opt.dataset.desc = test.description;
        }
        select.appendChild(opt);
      });

      // hiển thị mô tả test đầu tiên
      updateDesc();

      select.addEventListener("change", updateDesc);

      function updateDesc() {
        if (!desc) return;
        const opt = select.options[select.selectedIndex];
        const d = opt && opt.dataset.desc ? opt.dataset.desc : "";
        desc.textContent = d;
      }

      btn.addEventListener("click", () => {
        const id = select.value;
        if (!id) {
          alert("Bạn hãy chọn 1 bài test trước đã nhé.");
          return;
        }
        // chuyển sang trang làm bài
        window.location.href = "quizEng.html?test=" + encodeURIComponent(id);
      });
    } catch (err) {
      console.error(err);
      select.innerHTML = '<option value="">Lỗi khi tải danh sách bài test</option>';
      if (desc) desc.textContent =
        "Kiểm tra lại đường dẫn /content/testsManifest.json.";
    }
  }

  document.addEventListener("DOMContentLoaded", initEngTestPicker);
})();
