import { Color, colorToStyle } from "./lib/color.js";
import * as random from "./lib/random.js";
import { clamp, clamp01, lerp } from "./lib/math.js";

let mouse = [0, 0];
let downPosition = [0, 0];
let axes = [];
let activeColorCell;

const spaceColorStr = document.querySelector(".space-value");
const spaceSelect = document.querySelector(".space-select");
const outOfGamut = document.querySelector(".out-of-gamut");

const spaces = [
  {
    id: "oklch",
    dimensions: [
      { id: "l", name: "lightness", min: 0, max: 1 },
      { id: "c", name: "chroma", min: 0, max: 0.37 },
      { id: "h", name: "hue", min: 0, max: 360 },
    ],
  },
  {
    id: "okhsl",
    dimensions: [
      { id: "h", name: "hue", min: 0, max: 1 },
      { id: "s", name: "saturation", min: 0, max: 1 },
      { id: "l", name: "lightness", min: 0, max: 1 },
    ],
  },
  {
    id: "okhsv",
    dimensions: [
      { id: "h", name: "hue", min: 0, max: 1 },
      { id: "s", name: "saturation", min: 0, max: 1 },
      { id: "v", name: "value", min: 0, max: 1 },
    ],
  },
  {
    id: "lch",
    dimensions: [
      { id: "l", name: "lightness", min: 0, max: 100 },
      { id: "c", name: "chroma", min: 0, max: 150 },
      { id: "h", name: "hue", min: 0, max: 360 },
    ],
  },
  {
    id: "hsl",
    dimensions: [
      { id: "h", name: "hue", min: 0, max: 360 },
      { id: "s", name: "saturation", min: 0, max: 100 },
      { id: "l", name: "lightness", min: 0, max: 100 },
    ],
  },
  {
    id: "srgb",
    dimensions: [
      { id: "r", name: "red", min: 0, max: 1 },
      { id: "g", name: "green", min: 0, max: 1 },
      { id: "b", name: "blue", min: 0, max: 1 },
    ],
  },
  // {
  //   format: "hex",
  //   id: "srgb",
  //   dimensions: [
  //     { id: "r", name: "red", min: 0, max: 1 },
  //     { id: "g", name: "green", min: 0, max: 1 },
  //     { id: "b", name: "blue", min: 0, max: 1 },
  //   ],
  // },
];
window.addEventListener("pointerup", up, { passive: false });

document.addEventListener("copy", async (e) => {
  e.preventDefault();
  if (!activeColorCell) return;
  try {
    const str = String(spaceColorStr.textContent);
    console.log("writing", str);
    await navigator.clipboard.writeText(str);
    changeActive();
  } catch (err) {
    console.log(err);
  }
});

const spaceTool = setupSelects();
let useHex = false;

document.addEventListener("paste", (e) => {
  e.preventDefault();
  if (!activeColorCell) return;
  let text = (e.originalEvent || e).clipboardData.getData("text/plain");
  try {
    if (/^[A-F0-9]{6}$/i.test(text)) {
      // special case, paste without hash
      text = "#" + text;
    }
    const color = new Color(text);
    const matchIdx = spaces.findIndex((s) => color.spaceId === s.id);
    if (matchIdx >= 0) {
      spaceTool.selectIndex(matchIdx);
    }
    if (activeColorCell) {
      const curSpaceId = spaceTool.space.id;
      const outCol = color.to(curSpaceId);
      activeColorCell.color = outCol;
      changeActive();
    }
  } catch (err) {
    console.error("could not parse color", err);
  }
});

const orderCells = [...document.querySelectorAll(".cell")];
orderCells.reverse();
const cells = orderCells.map((element) => {
  const color = randomColor();
  updateColor(element, color);
  element.addEventListener("pointerdown", down, { passive: false });

  const cell = {
    rulers: [],
    color,
    element,
  };
  return cell;
});

activeColorCell = cells[cells.length - 1];
changeActive();

const check = document.querySelector("#duo-checkbox");
if (check) {
  check.addEventListener(
    "input",
    (ev) => {
      ev.preventDefault();
      cells[0].element.style.display = check.checked ? "" : "none";
      if (!check.checked) {
        const old = activeColorCell;
        activeColorCell = cells[cells.length - 1];
        if (old !== activeColorCell) changeActive();
      }
    },
    { passive: false }
  );
}

const hex = document.querySelector("#hex-checkbox");
hex.addEventListener(
  "input",
  (ev) => {
    ev.preventDefault();
    useHex = Boolean(ev.currentTarget.checked);
    updateColorText(spaceTool.space);
  },
  { passive: false }
);

window.addEventListener("keypress", (ev) => {
  if (activeColorCell && !ev.metaKey && !ev.ctrlKey) {
    if (ev.key.toLowerCase() === "r") {
      ev.preventDefault();
      const color = randomColor();
      activeColorCell.color = color;
    } else if (ev.key === "1" || ev.key === "2" || ev.key === "3") {
      ev.preventDefault();
      const space = spaceTool.space;
      const i = parseInt(ev.key, 10) - 1;
      const d = space.dimensions[i];
      let v = random.range(d.min, d.max);
      spaceTool.setSliderAtIndex(i, v);
      activeColorCell.color;
    }
    updateColor(activeColorCell.element, activeColorCell.color);
    spaceTool.updateSliders(activeColorCell.color);
  }
});

function down(ev) {
  const el = ev.target;
  const { clientX, clientY } = ev;
  ev.preventDefault();
  clearActive();
  document.body.style.cursor = "grabbing";
  downPosition[0] = clientX;
  downPosition[1] = clientY;
  activeColorCell = cells.find((c) => c.element === el);
  changeActive();
}

function randomColor() {
  const l = random.range(0.35, 0.75);
  const c = random.range(0.25, 0.37);
  const h = random.range(0, 360);
  return new Color("oklch", [l, c, h]);
}

function updateColor(el, color) {
  el.style.backgroundColor = colorToStyle(color);
}

function clearActive() {
  activeColorCell = null;
  changeActive();
}

function setupSelects() {
  spaces.forEach((space) => {
    const option = spaceSelect.appendChild(document.createElement("option"));
    option.value = space.id;
    option.textContent = space.format || space.id;
  });

  spaceSelect.addEventListener("change", onSpaceChange, { passive: false });

  let _spaceIndex;
  _spaceIndex = Math.max(0, spaceSelect.selectedIndex || 0);

  const axisLabels = [...document.querySelectorAll(".axis .label")];
  const xyz = [...document.querySelectorAll(".picker-slider")].map((e, i) => {
    e.addEventListener("input", (ev) => slide(ev, i), {
      passive: false,
    });
    return e;
  });

  onSpaceChange();

  return {
    spaceSelect,
    get space() {
      return spaces[_spaceIndex];
    },
    triggerSlide,
    selectIndex(index) {
      spaceSelect.selectedIndex = index;
      onSpaceChange();
    },
    setSliderAtIndex(index, value) {
      xyz[index].value = value;
      triggerSlide(value, index);
    },
    updateSliders,
  };

  function updateSliders(color) {
    const space = spaces[_spaceIndex];

    if (!color) color = new Color("#000000");
    xyz.forEach((el, i) => {
      const d = space.dimensions[i];
      el.value = color[space.id][d.id];
      el.value = clamp(el.value, d.min, d.max);
    });
  }

  function slide(ev, dimIndex) {
    const v = parseFloat(ev.currentTarget.value);
    triggerSlide(v, dimIndex);
  }

  function triggerSlide(value, dimIndex) {
    const space = spaces[_spaceIndex];
    const d = space.dimensions[dimIndex];
    if (activeColorCell) {
      activeColorCell.color[space.id][d.id] = value;
      updateColor(activeColorCell.element, activeColorCell.color);
      updateColorText(space);
    }
  }

  function onSpaceChange() {
    _spaceIndex = spaceSelect.selectedIndex;
    const space = spaces[_spaceIndex];
    updateColorText(space);
    xyz.forEach((el, i) => {
      const d = space.dimensions[i];
      el.min = d.min;
      el.max = d.max;
      el.step = d.step != null ? d.step : 0.01;
      axisLabels[i].textContent = d.id;
    });
    spaceSelect.blur();
    updateSliders(activeColorCell && activeColorCell.color);
  }
}
function up(ev) {
  const el = ev.currentTarget;
  const { clientX, clientY } = ev;
  document.body.style.cursor = "";
  ev.preventDefault();

  // console.log("cur target", ev.target);
  // if (ev.target !== activeColorCell) {
  // activeColorCell = null;
  // changeActive();
  // }
}

function clearRulers() {
  cells.forEach((cell) => {
    cell.rulers.forEach((e) => (e.style.display = "none"));
  });
}

function changeActive() {
  cells.forEach((c) => {
    if (c.element.classList.contains("active")) {
      c.element.classList.remove("active");
    }
  });
  clearRulers();
  if (activeColorCell) {
    activeColorCell.rulers.forEach((e) => (e.style.display = ""));
    activeColorCell.element.classList.remove("active");
    void activeColorCell.element.offsetWidth;
    activeColorCell.element.classList.add("active");
    updateColor(activeColorCell.element, activeColorCell.color);
    updateColorText(spaceTool.space);
    spaceTool.updateSliders(activeColorCell.color);
  }
}

function updateColorText(curSpace) {
  let str = "";
  if (activeColorCell) {
    const id = curSpace ? curSpace.format || curSpace.id : "srgb";
    str = serialize(activeColorCell.color, id);
    const isHex = id == "hex" || useHex;
    const inGamut = activeColorCell.color.inGamut("srgb");
    outOfGamut.style.visibility = !inGamut ? "visible" : "hidden";
    spaceColorStr.classList.remove("note");
    if (!inGamut && !isHex) spaceColorStr.classList.add("note");
  }
  spaceColorStr.textContent = str;
}

function serialize(c, m) {
  if (m == "hex" || useHex) {
    const srgb = c.to("srgb");
    srgb.toGamut();
    return srgb.toString({ format: "hex" });
  } else {
    return c.to(m).toString({ precision: 4 });
  }
}
