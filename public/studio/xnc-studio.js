// ======================
// XNC STUDIO – JS CHÍNH THỨC
// BẢN CẬP NHẬT 20/12 – TỰ ĐỔI HÀNH ĐỘNG THEO VẬT THỂ
// ======================

// ----------------------
// TẢI JSON
// ----------------------
let FACES = {};
let HANDS = {};
let MOTIONS = {};
let OBJECTS = {};

async function loadJSON(url) {
    const res = await fetch(url);
    return await res.json();
}
/*async function loadAllJSON() {
    try {
        // 1. Tải dữ liệu từ file
        const resFaces = await loadJSON("XNC_faces.json");
        const resHands = await loadJSON("XNC_hands.json");
        const resMotions = await loadJSON("XNC_motions.json");
        const resObjects = await loadJSON("XNC_objects.json");

        // 2. Gán vào biến toàn cục (phải khớp với key trong file JSON)
       FACES = resFaces.faces || [];
HANDS = resHands.hands || []; // Lưu ý kiểm tra lại key 'hands' trong JSON
MOTIONS = resMotions.motions || [];
OBJECTS = resObjects.objects || [];

        console.log("Dữ liệu đã nạp:", { FACES, HANDS, MOTIONS, OBJECTS });

        // 3. Chỉ gọi đổ dữ liệu khi đã có mảng
        populateDropdowns();

    } catch (err) {
        console.error("Lỗi thực thi loadAllJSON:", err);
    }
}*/
 async function loadAllJSON() {
    try {
        FACES = await loadJSON("XNC_faces.json");
        HANDS = await loadJSON("XNC_hands.json");
        MOTIONS = await loadJSON("XNC_motions.json");
        OBJECTS = await loadJSON("XNC_objects.json");

        console.log("Loaded JSON:", { FACES, HANDS, MOTIONS, OBJECTS });

        populateDropdowns();
    } catch (err) {
        console.error("Lỗi load JSON:", err);
    }
} 

document.addEventListener("DOMContentLoaded", loadAllJSON);


// ----------------------
// TẠO DROPDOWN
// ----------------------
function populateDropdowns() {
    populateFaces();
    populateHands();
    populateMotions();
    populateObjects();
}

function populateFaces() {
    const sel = document.getElementById("pFace");
    if (!sel) return;
    sel.innerHTML = '<option value="">(none)</option>';
    
    // Sửa chỗ này: Bỏ chữ .faces đi
    FACES.forEach(f => {
        sel.innerHTML += `<option value="${f.id}">${f.label}</option>`;
    });
}

function populateHands() {
    const sel = document.getElementById("pHand");
    if (!sel) return;
    sel.innerHTML = '<option value="">(none)</option>';
    
    // Sửa chỗ này: Bỏ chữ .hands đi
    HANDS.forEach(h => {
        sel.innerHTML += `<option value="${h.id}">${h.label}</option>`;
    });
}

function populateMotions() {
    const sel = document.getElementById("pAction");
    if (!sel) return;
    sel.innerHTML = `<option value="">(none)</option>`;
    MOTIONS.forEach(m => {
        sel.innerHTML += `<option value="${m.id}">${m.label_v}</option>`;
    });
}

function populateObjects() {
    const sel = document.getElementById("pObject");
    if (!sel) return;
    sel.innerHTML = `<option value="">(none)</option>`;
    OBJECTS.forEach(o => {
        sel.innerHTML += `<option value="${o.id}">${o.label_v}</option>`;
    });
}



// ======================================================
// BUILD PROMPT
// ======================================================
function buildPromptVI() {

    let parts = [];

    // Các input
    const character = getSelValue("pChar");
    const faceId = getSelValue("pFace");
    const actionId = getSelValue("pAction");
    const camAngle = getSelValue("pCam");
    const style = getSelValue("pStyle");
    const backdrop = getSelValue("pBackground");

    const objectId = getSelValue("pObject");
    const objectCustom = getInputValue("pObjectCustom");
    const objectQuantity = getInputValue("pObjectQty");

    const handId = getSelValue("pHand");
    const handPose = getSelValue("pHandPose");

    const camNote = getInputValue("pCamNote");
    const extraNote = getInputValue("pNote");

    // 1 — Nhân vật
    if (character) {
        parts.push(`Nhân vật: ${character}.`);
    }

    // 2 — Biểu cảm mặt
    if (faceId && FACES.faces) {
        const f = FACES.faces.find(x => x.id === faceId);
        if (f) parts.push(`Biểu cảm: ${f.label_v}.`);
    }

    // 3 — XỬ LÝ ACTION CÓ [vật thể]
    let actionLabel = "";
    if (actionId && MOTIONS.motions) {
        const a = MOTIONS.motions.find(x => x.id === actionId);
        if (a) actionLabel = a.label_v;
    }

    // Resolve object label
    let objectLabel = "";
    if (objectCustom) {
        objectLabel = objectCustom.trim(); // ưu tiên text nhập tay
    } else if (objectId && OBJECTS.objects) {
        const o = OBJECTS.objects.find(x => x.id === objectId);
        if (o) objectLabel = o.label_v;
    }

    // Replace placeholder
    if (actionLabel.includes("[vật thể]")) {
        const repl = objectLabel || "vật thể";
        actionLabel = actionLabel.replace("[vật thể]", repl);
    }

    if (actionLabel) {
        parts.push(`Hành động: ${actionLabel}.`);
    }

    // 4 — Bối cảnh
    if (backdrop) {
        parts.push(`Bối cảnh: ${backdrop}.`);
    }

    // 5 — Camera
    if (camAngle) {
        parts.push(`Góc máy: ${camAngle}.`);
    }
    if (camNote) {
        parts.push(`Ghi chú góc máy: ${camNote}.`);
    }

    // 6 — Vật thể (object)
    if (objectLabel) {
        parts.push(`Vật thể: ${objectLabel}.`);
    }
    if (objectQuantity) {
        parts.push(`Số lượng: ${objectQuantity}.`);
    }

    // 7 — Tay nhân vật
    if (handId && HANDS.hands) {
        const h = HANDS.hands.find(x => x.id === handId);
        if (h) parts.push(`Tay nhân vật: ${h.label_v}.`);
    }
    if (handPose) {
        parts.push(`Tư thế tay: ${handPose}.`);
    }

    // 8 — Phong cách
    if (style) {
        parts.push(`Phong cách: ${style}.`);
    }

    // 9 — Extra note
    if (extraNote) {
        parts.push(extraNote);
    }

    // 10 — Tone
    parts.push("Tone: hài đời thường, Việt Nam, motion comic sạch, nhân vật rõ, không chữ, không logo, tránh vibe Hàn/Idol.");

    return parts.join(" ");
}



// ======================================================
// BUTTON GENERATE
// ======================================================
function onGeneratePrompt() {
    const vi = buildPromptVI();
    document.getElementById("promptVI").value = vi;

    const json = {
        prompt_id: getInputValue("pID"),
        name: getInputValue("pName"),
        type: getSelValue("pType"),
        character: getSelValue("pChar"),
        face: getSelValue("pFace"),
        face_note: "",
        action: getSelValue("pAction"),
        camera: getSelValue("pCam"),
        backdrop: getSelValue("pBackground"),
        objects: getSelValue("pObject"),
        objects_custom: getInputValue("pObjectCustom"),
        objects_qty: getInputValue("pObjectQty"),
        hand: getSelValue("pHand"),
        hand_pose: getSelValue("pHandPose"),
        note: getInputValue("pNote"),
        camera_note: getInputValue("pCamNote"),
        style: getSelValue("pStyle"),
        final_prompt: vi
    };

    document.getElementById("promptJSON").value = JSON.stringify(json, null, 4);
}



// ======================================================
// TIỆN ÍCH
// ======================================================
function getSelValue(id) {
    const el = document.getElementById(id);
    if (!el) return "";
    return el.value || "";
}

function getInputValue(id) {
    const el = document.getElementById(id);
    if (!el) return "";
    return el.value || "";
}
// Logic chuyển đổi Tab
document.querySelectorAll('.tabbtn').forEach(button => {
    button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-tab');

        // 1. Đổi trạng thái active của nút
        document.querySelectorAll('.tabbtn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // 2. Ẩn/Hiện nội dung tương ứng
        if (tabName === 'prompt') {
            document.getElementById('tab-prompt').classList.remove('hidden');
            document.getElementById('tab-compose').classList.add('hidden');
        } else {
            document.getElementById('tab-prompt').classList.add('hidden');
            document.getElementById('tab-compose').classList.remove('hidden');
        }
    });
});
