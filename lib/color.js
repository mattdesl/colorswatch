import {
  srgb_to_okhsl,
  okhsl_to_srgb,
  srgb_to_okhsv,
  okhsv_to_srgb,
} from "./oklab.js";
import Color from "./vendor/color.min.js";
import { clamp01 } from "./math.js";

const sRGB = Color.spaces.srgb;

const okhsl = new Color.Space({
  id: "okhsl",
  name: "OKHSL",
  coords: {
    h: {
      refRange: [0, 1],
      type: "angle",
      name: "Hue",
    },
    s: {
      refRange: [0, 1],
      name: "Saturation",
    },
    l: {
      refRange: [0, 1],
      name: "Lightness",
    },
  },

  base: sRGB,
  fromBase(sRGB) {
    return srgb_to_okhsl(...sRGB.map((x) => clamp01(x) * 0xff));
  },
  toBase(hsl) {
    return okhsl_to_srgb(...hsl).map((x) => clamp01(x / 0xff));
  },
  formats: {
    okhsl: {
      coords: ["<number>", "<number>", "<number>"],
    },
  },
});

const okhsv = new Color.Space({
  id: "okhsv",
  name: "OKHSV",
  coords: {
    h: {
      refRange: [0, 1],
      type: "angle",
      name: "Hue",
    },
    s: {
      refRange: [0, 1],
      name: "Saturation",
    },
    v: {
      refRange: [0, 1],
      name: "Value",
    },
  },

  base: sRGB,
  fromBase(sRGB) {
    return srgb_to_okhsv(...sRGB.map((x) => clamp01(x) * 0xff));
  },
  toBase(hsl) {
    return okhsv_to_srgb(...hsl).map((x) => clamp01(x / 0xff));
  },
  formats: {
    okhsv: {
      coords: ["<number>", "<number>", "<number>"],
    },
  },
});

Color.Space.register(okhsl);
Color.Space.register(okhsv);

export { Color };

const supportsP3 =
  window.CSS && CSS.supports("color", "color(display-p3 0 1 0)");
const outputSpaceId = supportsP3 ? "p3" : "srgb";

// This is to handle older browsers and also edge case on
// Safari 16.1 which seems to support display-p3 but not full
// CSS color spec
export function colorToStyle(color, spaceId = outputSpaceId) {
  // re-parse string if not rgb/hsl
  if (typeof color === "string") {
    return colorToStyle(new Color(color));
  }

  // edge case
  if (!color || !color.spaceId) return String(color);

  // operate on a copy
  color = color.clone();

  // convert to output space
  if (!color.spaceId !== spaceId) color = color.to(spaceId);

  // clamp to space's color gamut
  color.toGamut({ space: spaceId });

  return color.toString();
}
