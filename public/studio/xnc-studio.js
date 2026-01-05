// ======================
// XNC STUDIO – JS ĐÃ SỬA LỖI (05/01/2026)
// ======================

let FACES = {};
let HANDS = {};
let MOTIONS = {};
let OBJECTS = {};

async function loadJSON(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error(`Không load được ${url}:`, err);
        return null;
    }
}

async function loadAllJSON() {
    console.log("Bắt đầu load JSON...");

    FACES = await loadJSON("XNC_faces.json");
    HANDS = await loadJSON("XNC_hands.json");
    MOTIONS = await loadJSON("XNC_motions.json");
    OBJECTS = await loadJSON("XNC_objects.json");

    if (!FACES || !HANDS || !MOTIONS || !OBJECTS) {
        document.getElementById("labelsStatus").textContent = "Lỗi load JSON – xem console (F12)";
        document.getElementById("labelsStatus").style.background = "#e57373";
        return;
    }

    console.log("Đã load thành công tất cả JSON!");
    document.getElementById("labelsStatus").textContent = "Labels đã load xong ✓";
    document.getElementById("labelsStatus").style.background = "#8ccb7a";

    populateDropdowns();
}

document.addEventListener("DOMContentLoaded", loadAllJSON);

function populateDropdowns() {
    populateFaces();
    populateHands();
    populateMotions();
    populateObjects();
}

function populateFaces() {
    const sel = document.getElementById("pFace");
    if (!sel || !FACES.faces) return;
    sel.innerHTML = `<option value="">(none)</option>`;
    FACES.faces.forEach(f => {
        sel.innerHTML += `<option value="${f.id}">${f.label_v}</option>`;
    });
}

function populateHands() {
    const sel = document.getElementById("pHand");
    if (!sel || !HANDS.hands) return;
    sel.innerHTML = `<option value="">(none)</option>`;
    HANDS.hands.forEach(h => {
        sel.innerHTML += `<option value="${h.id}">${h.label_v}</option>`;
    });
}

function populateMotions() {
    const sel = document.getElementById("pAction");
    if (!sel || !MOTIONS.motions) return;
    sel.innerHTML = `<option value="">(none)</option>`;
    MOTIONS.motions.forEach(m => {
        sel.innerHTML += `<option value="${m.id}">${m.label_v}</option>`;
    });
}

function populateObjects() {
    const sel = document.getElementById("pObject");
    if (!sel || !OBJECTS.objects) return;
    sel.innerHTML = `<option value="">(none)</option>`;
    OBJECTS.objects.forEach(o => {
        sel.innerHTML += `<option value="${o.id}">${o.label_v}</option>`;
    });
}

// ======================================================
// BUILD PROMPT
// ======================================================
function buildPromptVI() {
    let parts = [];

    const character = getSelValue("pChar");
    const faceId = getSelValue("pFace");
    const actionId = getSelValue("pAction");
    const camAngle = getSelValue("pCam");
    const style = getSelValue("pStyle");
    const backdrop = getSelValue("pBg"); // sửa từ pBackground

    const objectId = getSelValue("pObject");
    const objectCustom = getInputValue("pObjectCustom");
    const objectQuantity = getInputValue("pObjectCount"); // sửa từ pObjectQty

    const handId = getSelValue("pHand");
    const handPose = getSelValue("pHandPose");

    const camNote = getInputValue("pCamNote");
    const extraNote = getInputValue("pNote");

    if (character) parts.push(`Nhân vật: ${character}.`);
    if (faceId && FACES.faces) {
        const f = FACES.faces.find(x => x.id === faceId);
        if (f) parts.push(`Biểu cảm: ${f.label_v}.`);
    }

    let actionLabel = "";
    if (actionId && MOTIONS.motions) {
        const a = MOTIONS.motions.find(x => x.id === actionId);
        if (a) actionLabel = a.label_v;
    }

    let objectLabel = objectCustom.trim() || "";
    if (!objectLabel && objectId && OBJECTS.objects) {
        const o = OBJECTS.objects.find(x => x.id === objectId);
        if (o) objectLabel = o.label_v;
    }

    if (actionLabel.includes("[vật thể]")) {
        actionLabel = actionLabel.replace("[vật thể]", objectLabel || "vật thể");
    }

    if (actionLabel) parts.push(`Hành động: ${actionLabel}.`);

    if (backdrop) parts.push(`Bối cảnh: ${backdrop}.`);
    if (camAngle) parts.push(`Góc máy: ${camAngle}.`);
    if (camNote) parts.push(`Ghi chú góc máy: ${camNote}.`);
    if (objectLabel) parts.push(`Vật thể: ${objectLabel}.`);
    if (objectQuantity) parts.push(`Số lượng: ${objectQuantity}.`);

    if (handId && HANDS.hands) {
        const h = HANDS.hands.find(x => x.id === handId);
        if (h) parts.push(`Tay nhân vật: ${h.label_v}.`);
    }
    if (handPose) parts.push(`Tư thế tay: ${handPose}.`);

    if (style) parts.push(`Phong cách: ${style}.`);
    if (extraNote) parts.push(extraNote);

    parts.push("Tone: hài đời thường, Việt Nam, motion comic sạch, nhân vật rõ, không chữ, không logo, tránh vibe Hàn/Idol.");

    return parts.join(" ");
}

// ======================================================
// BUTTON GENERATE
// ======================================================
document.getElementById("btnGen")?.addEventListener("click", () => {
    const vi = buildPromptVI();
    document.getElementById("pOut").value = vi; // sửa ID

    const json = {
        prompt_id: getInputValue("pId"), // sửa thành pId
        name: getInputValue("pName"),
        type: getSelValue("pType"),
        character: getSelValue("pChar"),
        face: getSelValue("pFace"),
        action: getSelValue("pAction"),
        camera: getSelValue("pCam"),
        backdrop: getSelValue("pBg"),
        objects: getSelValue("pObject"),
        objects_custom: getInputValue("pObjectCustom"),
        objects_qty: getInputValue("pObjectCount"), // sửa
        hand: getSelValue("pHand"),
        hand_pose: getSelValue("pHandPose"),
        note: getInputValue("pNote"),
        camera_note: getInputValue("pCamNote"),
        style: getSelValue("pStyle"),
        final_prompt: vi
    };

    document.getElementById("pJson").value = JSON.stringify(json, null, 4); // sửa ID
});

// ======================================================
// TIỆN ÍCH
// ======================================================
function getSelValue(id) {
    const el = document.getElementById(id);
    return el?.value || "";
}

function getInputValue(id) {
    const el = document.getElementById(id);
    return el?.value.trim() || "";
}
