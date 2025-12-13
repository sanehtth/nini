const $ = id => document.getElementById(id);

/* ========= LAYOUT DEFINITIONS ========= */
const LAYOUTS = [
  {
    id: "1_full",
    label: "1 khung (toàn màn hình)",
    panelCount: 1,
    css: { columns: "1fr", rows: "1fr", areas: `"a"` }
  },

  {
    id: "2_col",
    label: "2 khung ngang",
    panelCount: 2,
    css: { columns: "1fr 1fr", rows: "1fr", areas: `"a b"` }
  },

  {
    id: "2_row",
    label: "2 khung dọc",
    panelCount: 2,
    css: { columns: "1fr", rows: "1fr 1fr", areas: `"a" "b"` }
  },

  {
    id: "3_row",
    label: "3 khung dọc",
    panelCount: 3,
    css: { columns: "1fr", rows: "1fr 1fr 1fr", areas: `"a" "b" "c"` }
  },

  {
    id: "3_col",
    label: "3 khung ngang",
    panelCount: 3,
    css: { columns: "1fr 1fr 1fr", rows: "1fr", areas: `"a b c"` }
  },

  {
    id: "3_2top1",
    label: "3 khung (2 trên – 1 dưới)",
    panelCount: 3,
    css: {
      columns: "1fr 1fr",
      rows: "1fr 1fr",
      areas: `"a b" "c c"`
    }
  },

  {
    id: "3_1top2",
    label: "3 khung (1 trên – 2 dưới)",
    panelCount: 3,
    css: {
      columns: "1fr 1fr",
      rows: "1fr 1fr",
      areas: `"a a" "b c"`
    }
  },

  {
    id: "3_1left2right",
    label: "3 khung (1 trái – 2 phải)",
    panelCount: 3,
    css: {
      columns: "1fr 1fr",
      rows: "1fr 1fr",
      areas: `"a b" "a c"`
    }
  },

  {
    id: "3_2left1right",
    label: "3 khung (2 trái – 1 phải)",
    panelCount: 3,
    css: {
      columns: "1fr 1fr",
      rows: "1fr 1fr",
      areas: `"a b" "c b"`
    }
  }
];

/* ========= STATE ========= */
const state = {
  layoutId: null,
  panels: [],
  activePanel: 0
};

/* ========= INIT ========= */
function init() {
  const layoutSelect = $("layoutSelect");

  LAYOUTS.forEach(l => {
    const opt = document.createElement("option");
    opt.value = l.id;
    opt.textContent = l.label;
    layoutSelect.appendChild(opt);
  });

  layoutSelect.onchange = () => setLayout(layoutSelect.value);

  setLayout("3_row");
}

function setLayout(layoutId) {
  const layout = LAYOUTS.find(l => l.id === layoutId);
  state.layoutId = layoutId;
  state.panels = Array.from({ length: layout.panelCount }, () => ({ actors: [] }));

  const grid = $("grid");
  grid.innerHTML = "";
  grid.style.gridTemplateColumns = layout.css.columns;
  grid.style.gridTemplateRows = layout.css.rows;
  grid.style.gridTemplateAreas = layout.css.areas;

  const areas = ["a", "b", "c", "d"];

  for (let i = 0; i < layout.panelCount; i++) {
    const panel = document.createElement("div");
    panel.className = "panel";
    panel.style.gridArea = areas[i];
    panel.innerHTML = `<span class="panelTag">P${i + 1}</span>`;
    panel.onclick = () => selectPanel(i);
    grid.appendChild(panel);
  }

  renderPanelSelect();
}

function renderPanelSelect() {
  const sel = $("panelSelect");
  sel.innerHTML = "";
  state.panels.forEach((_, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `P${i + 1}`;
    sel.appendChild(opt);
  });
  sel.onchange = () => selectPanel(+sel.value);
}

function selectPanel(i) {
  state.activePanel = i;
}

window.onload = init;
