import jsQR from "jsqr";
import { readBarcodes } from "zxing-wasm/reader";
import {
  BinaryBitmap,
  DecodeHintType,
  GlobalHistogramBinarizer,
  HTMLCanvasElementLuminanceSource,
  HybridBinarizer,
  QRCodeReader,
} from "@zxing/library";

/**
 * Đọc thông tin từ mã QR trên CCCD gắn chip, chạy hoàn toàn trên trình duyệt.
 *
 * Nội dung mã QR là một chuỗi các trường ngăn cách bằng dấu "|":
 *   Số CCCD | Số CMND cũ | Họ tên | Ngày sinh | Giới tính | Địa chỉ | Ngày cấp
 * Ngày ở dạng ddMMyyyy, ví dụ 01011990. Số CMND cũ có thể để trống.
 */

// ---------- 1. Phân tích chuỗi trong mã QR ----------

// "01011990" (hoặc "01/01/1990") thành "1990-01-01"; sai định dạng thì trả null
const toIsoDate = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (digits.length !== 8) return null;

  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4);

  const date = new Date(`${year}-${month}-${day}T00:00:00`);
  const valid =
    !Number.isNaN(date.getTime()) &&
    date.getDate() === Number(day) &&
    date.getMonth() + 1 === Number(month);

  return valid ? `${year}-${month}-${day}` : null;
};

// "Nam" thành MALE, "Nữ" thành FEMALE (giá trị mà form đang dùng)
const toGender = (value) => {
  const text = String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

  if (text === "nam") return "MALE";
  if (text === "nu") return "FEMALE";

  return null;
};

/**
 * Trả về { identityNumber, fullName, dateOfBirth, gender, permanentAddress,
 * identityIssuedDate } (ngày dạng YYYY-MM-DD), hoặc null nếu chuỗi
 * không phải mã QR của CCCD.
 */
export const parseCccdQr = (text) => {
  const parts = String(text ?? "")
    .split("|")
    .map((part) => part.trim());

  // Tối thiểu 6 trường (thẻ thiếu ngày cấp vẫn đọc được phần còn lại)
  if (parts.length < 6) return null;

  const [rawNumber, , fullName, birth, gender, address, issued] = parts;

  // Số CCCD gồm 12 chữ số (bỏ khoảng trắng nếu có, vd "0192 0200 3046")
  const identityNumber = rawNumber.replace(/\s/g, "");

  if (!/^\d{12}$/.test(identityNumber)) return null;

  return {
    identityNumber,
    fullName: fullName || null,
    dateOfBirth: toIsoDate(birth),
    gender: toGender(gender),
    permanentAddress: address || null,
    identityIssuedDate: toIsoDate(issued),
  };
};

// ---------- 2. Tìm và giải mã mã QR trong ảnh ----------

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Không mở được ảnh"));
    };

    image.src = url;
  });

// Bộ đọc QR có sẵn của trình duyệt (Chrome/Edge trên Android, macOS...)
const decodeWithBarcodeDetector = async (image) => {
  if (typeof window === "undefined" || !("BarcodeDetector" in window)) {
    return null;
  }

  try {
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    const found = await detector.detect(image);

    return found[0]?.rawValue || null;
  } catch {
    return null;
  }
};

// Vẽ một vùng của ảnh ra canvas, phóng/thu sao cho cạnh dài bằng longSide
const drawRegion = (image, region, longSide, maxUpscale = 6, smooth = true) => {
  const { sx, sy, sw, sh } = region;
  const scale = Math.min(longSide / Math.max(sw, sh), maxUpscale);
  const width = Math.max(1, Math.round(sw * scale));
  const height = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.imageSmoothingEnabled = smooth;
  context.imageSmoothingQuality = "high";
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, sx, sy, sw, sh, 0, 0, width, height);

  return { canvas, context, width, height };
};

// ---- Làm rõ ảnh: thẻ CCCD có nền họa tiết nên QR thường mờ và thiếu tương phản ----

const toGray = (rgba, pixelCount) => {
  const gray = new Uint8ClampedArray(pixelCount);

  for (let i = 0; i < pixelCount; i += 1) {
    gray[i] =
      0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
  }

  return gray;
};

// Kéo giãn độ sáng: điểm tối nhất (1%) thành đen, sáng nhất (99%) thành trắng
const stretchContrast = (gray) => {
  const histogram = new Uint32Array(256);
  gray.forEach((value) => {
    histogram[value] += 1;
  });

  const total = gray.length;
  let low = 0;
  let high = 255;
  let sum = 0;

  for (let i = 0; i < 256; i += 1) {
    sum += histogram[i];
    if (sum >= total * 0.01) {
      low = i;
      break;
    }
  }

  sum = 0;
  for (let i = 255; i >= 0; i -= 1) {
    sum += histogram[i];
    if (sum >= total * 0.01) {
      high = i;
      break;
    }
  }

  const range = Math.max(1, high - low);
  const result = new Uint8ClampedArray(gray.length);

  for (let i = 0; i < gray.length; i += 1) {
    result[i] = ((gray[i] - low) * 255) / range;
  }

  return result;
};

// Tách đen trắng theo độ sáng trung bình vùng lân cận (Bradley), chịu được
// ánh sáng không đều và vệt chói trên thẻ
const adaptiveThreshold = (gray, width, height) => {
  const integral = new Float64Array((width + 1) * (height + 1));

  for (let y = 1; y <= height; y += 1) {
    let rowSum = 0;

    for (let x = 1; x <= width; x += 1) {
      rowSum += gray[(y - 1) * width + (x - 1)];
      integral[y * (width + 1) + x] =
        integral[(y - 1) * (width + 1) + x] + rowSum;
    }
  }

  const half = Math.max(8, Math.round(Math.min(width, height) / 16));
  const result = new Uint8ClampedArray(gray.length);

  for (let y = 0; y < height; y += 1) {
    const y1 = Math.max(0, y - half);
    const y2 = Math.min(height - 1, y + half);

    for (let x = 0; x < width; x += 1) {
      const x1 = Math.max(0, x - half);
      const x2 = Math.min(width - 1, x + half);
      const count = (x2 - x1 + 1) * (y2 - y1 + 1);

      const sum =
        integral[(y2 + 1) * (width + 1) + (x2 + 1)] -
        integral[y1 * (width + 1) + (x2 + 1)] -
        integral[(y2 + 1) * (width + 1) + x1] +
        integral[y1 * (width + 1) + x1];

      result[y * width + x] = gray[y * width + x] * count < sum * 0.85 ? 0 : 255;
    }
  }

  return result;
};

// Ghi ảnh xám ra canvas mới để đưa cho bộ đọc
const grayToCanvas = (gray, width, height) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = context.createImageData(width, height);

  for (let i = 0; i < gray.length; i += 1) {
    imageData.data[i * 4] = gray[i];
    imageData.data[i * 4 + 1] = gray[i];
    imageData.data[i * 4 + 2] = gray[i];
    imageData.data[i * 4 + 3] = 255;
  }

  context.putImageData(imageData, 0, 0);

  return { canvas, context, width, height };
};

// ---- Hai bộ đọc ----

const decodeWithJsQr = ({ context, width, height }, thorough = true) => {
  const { data } = context.getImageData(0, 0, width, height);
  const result = jsQR(data, width, height, {
    // CCCD là mã đen trên nền trắng, chỉ lượt kỹ mới thử thêm mã đảo màu
    inversionAttempts: thorough ? "attemptBoth" : "dontInvert",
  });

  return result?.data || null;
};

const zxingHints = new Map([
  [DecodeHintType.TRY_HARDER, true],
  [DecodeHintType.CHARACTER_SET, "UTF-8"],
]);

// ZXing bản JavaScript. Thử hai cách tách đen trắng vì ảnh chói sáng hợp
// cách này, ảnh tối hợp cách kia.
const decodeWithZxing = ({ canvas }, thorough = true) => {
  const source = new HTMLCanvasElementLuminanceSource(canvas);
  const reader = new QRCodeReader();

  // Lượt nhanh chỉ dùng cách tách thường dùng nhất
  const binarizers = thorough
    ? [HybridBinarizer, GlobalHistogramBinarizer]
    : [HybridBinarizer];

  for (const Binarizer of binarizers) {
    try {
      const result = reader.decode(
        new BinaryBitmap(new Binarizer(source)),
        zxingHints,
      );

      if (result?.getText()) return result.getText();
    } catch {
      // Không thấy mã ở cách này, thử cách tiếp theo
    }
  }

  return null;
};

// Ba cách xử lý ảnh, từ nhanh đến chậm. thorough = thử đủ mọi bộ tách màu
const PIPELINES = {
  // Ảnh gốc, không xử lý thêm
  raw: (raw, thorough) =>
    decodeWithZxing(raw, thorough) || decodeWithJsQr(raw, thorough),

  // Kéo giãn tương phản
  stretch: (raw, thorough) => {
    const { data } = raw.context.getImageData(0, 0, raw.width, raw.height);
    const gray = toGray(data, raw.width * raw.height);

    return decodeWithZxing(
      grayToCanvas(stretchContrast(gray), raw.width, raw.height),
      thorough,
    );
  },

  // Tách đen trắng theo vùng lân cận
  binary: (raw, thorough) => {
    const { data } = raw.context.getImageData(0, 0, raw.width, raw.height);
    const gray = toGray(data, raw.width * raw.height);

    const binary = grayToCanvas(
      adaptiveThreshold(stretchContrast(gray), raw.width, raw.height),
      raw.width,
      raw.height,
    );

    return decodeWithZxing(binary, thorough) || decodeWithJsQr(binary, thorough);
  },
};

// Thử một vùng ảnh với một cỡ, một kiểu phóng và một cách xử lý
const decodeRegion = (image, region, longSide, pass) => {
  const raw = drawRegion(image, region, longSide, 6, pass.smooth);

  return PIPELINES[pass.pipeline](raw, pass.thorough);
};

// Các vùng cần thử: toàn ảnh, rồi ô lớn (nửa ảnh) và ô nhỏ (hơn 1/3 ảnh)
// chồng lên nhau. Mã QR trên thẻ nhỏ nên ô nhỏ sau khi phóng to là cách
// đọc hiệu quả nhất.
const buildRegions = (width, height) => {
  const regions = [{ sx: 0, sy: 0, sw: width, sh: height, label: "toàn ảnh" }];

  [
    { ratio: 0.5, positions: [0, 0.25, 0.5] },
    { ratio: 0.36, positions: [0, 0.21, 0.43, 0.64] },
    { ratio: 0.26, positions: [0, 0.18, 0.36, 0.54, 0.72] },
  ].forEach(({ ratio, positions }) => {
    const sw = Math.round(width * ratio);
    const sh = Math.round(height * ratio);

    // Mở rộng mỗi ô thêm một lề để không cắt mất viền trắng quanh mã QR
    const padX = Math.round(width * 0.05);
    const padY = Math.round(height * 0.05);

    positions.forEach((py) => {
      positions.forEach((px) => {
        const sx = Math.max(0, Math.round(width * px) - padX);
        const sy = Math.max(0, Math.round(height * py) - padY);

        regions.push({
          sx,
          sy,
          sw: Math.min(width - sx, sw + padX * 2),
          sh: Math.min(height - sy, sh + padY * 2),
          label: `ô ${Math.round(ratio * 100)}% (${px},${py})`,
        });
      });
    });
  });

  return regions;
};

const nextFrame = () => new Promise((resolve) => setTimeout(resolve, 0));

// Trên CCCD gắn chip, mã QR nằm ở góc TRÊN BÊN PHẢI mặt trước. Thử các vùng
// ở góc đó trước (tính theo tỉ lệ ảnh), nên thường đọc được ngay lượt đầu.
const buildPriorityRegions = (width, height) =>
  [
    { x: 0.5, y: 0, w: 0.5, h: 0.55 },
    { x: 0.6, y: 0, w: 0.4, h: 0.45 },
    { x: 0.55, y: 0.02, w: 0.4, h: 0.4 },
    { x: 0.65, y: 0, w: 0.35, h: 0.35 },
    { x: 0.4, y: 0, w: 0.6, h: 0.65 },
  ].map(({ x, y, w, h }) => ({
    sx: Math.round(width * x),
    sy: Math.round(height * y),
    sw: Math.round(width * w),
    sh: Math.round(height * h),
    label: `góc trên phải (${x},${y},${w}x${h})`,
  }));

// Các lượt thử, từ rẻ đến đắt. Mỗi lượt quét hết các vùng rồi mới sang lượt
// sau, nên ảnh dễ đọc được xử lý rất nhanh và chỉ ảnh khó mới phải chạy đủ.
// Chữ "whole" là vùng toàn ảnh, "crop" là các ô cắt.
const PASSES = [
  { name: "nhanh", pipeline: "raw", smooth: true, whole: [1], crop: [900] },
  { name: "phóng lớn", pipeline: "raw", smooth: true, whole: [1600], crop: [1400] },
  { name: "giữ cạnh sắc", pipeline: "raw", smooth: false, whole: [], crop: [900, 1400] },
  { name: "tương phản", pipeline: "stretch", smooth: true, whole: [1], crop: [900] },
  { name: "đen trắng", pipeline: "binary", smooth: true, thorough: true, whole: [1], crop: [900, 1400] },
];

// Quét một nhóm vùng qua lần lượt các lượt thử
const scanRegions = async (image, regions, state) => {
  for (const pass of PASSES) {
    for (const region of regions) {
      const isWhole = region.label === "toàn ảnh";
      const nativeLong = Math.max(region.sw, region.sh);

      // Số 1 nghĩa là giữ cỡ gốc (tối đa 1600 px)
      const sizes = (isWhole ? pass.whole : pass.crop).map((size) =>
        size === 1 ? Math.min(nativeLong, 1600) : size,
      );

      for (const longSide of sizes) {
        state.attempts += 1;

        let text = null;

        try {
          text = decodeRegion(image, region, longSide, pass);
        } catch (error) {
          console.warn(`Lỗi khi đọc ${region.label}:`, error);
        }

        if (text) {
          return {
            text,
            log: [
              `ĐỌC ĐƯỢC ở lượt "${pass.name}", ${region.label}, cỡ ${longSide}px (lần thử ${state.attempts}, ${Math.round(performance.now() - state.startedAt)} ms)`,
            ],
          };
        }
      }

      // Nhường luồng chính để giao diện không bị đơ
      await nextFrame();
    }
  }

  return null;
};

const decodeOnCanvases = async (image) => {
  const state = { attempts: 0, startedAt: performance.now() };

  // Bước 1: chỉ góc trên phải (nơi có mã QR)
  const corner = await scanRegions(
    image,
    buildPriorityRegions(image.width, image.height),
    state,
  );

  if (corner) return corner;

  // Bước 2: ảnh chụp lệch/xoay, quét toàn bộ như trước
  const all = await scanRegions(
    image,
    buildRegions(image.width, image.height),
    state,
  );

  return (
    all || {
      text: null,
      log: [`Không thấy mã QR sau ${state.attempts} lần thử`],
    }
  );
};

const WASM_OPTIONS = {
  formats: ["QRCode"],
  tryHarder: true,
  tryRotate: true,
  tryInvert: true,
  tryDownscale: true,
  maxNumberOfSymbols: 1,
};

// Ưu tiên đọc từ byte thô theo UTF-8 để giữ đúng tiếng Việt có dấu
const wasmTextOf = (result) =>
  result.bytes?.length
    ? new TextDecoder("utf-8").decode(result.bytes)
    : result.text;

const pickWasmHit = (results) =>
  results.find((r) => r.isValid !== false && (r.bytes?.length || r.text));

const decodeWithWasm = async (file, image) => {
  try {
    let hit = pickWasmHit(await readBarcodes(file, WASM_OPTIONS));

    if (hit) {
      console.info("zxing-wasm: ĐỌC ĐƯỢC ở ảnh gốc");
      return wasmTextOf(hit);
    }

    // Ảnh nhỏ thì phóng gấp đôi rồi đọc lại
    const factor = image.width < 1400 ? 2 : 1;
    const canvas = document.createElement("canvas");
    canvas.width = image.width * factor;
    canvas.height = image.height * factor;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    hit = pickWasmHit(
      await readBarcodes(
        context.getImageData(0, 0, canvas.width, canvas.height),
        WASM_OPTIONS,
      ),
    );

    if (hit) {
      console.info(`zxing-wasm: ĐỌC ĐƯỢC sau khi phóng x${factor}`);
      return wasmTextOf(hit);
    }

    console.info("zxing-wasm: không thấy mã QR");
  } catch (error) {
    console.warn("zxing-wasm lỗi, chuyển sang bộ đọc JavaScript:", error);
  }

  return null;
};

// Trả về chuỗi trong mã QR, hoặc null nếu ảnh không có mã đọc được.
// Nhật ký từng bước được in ở console để dò lỗi.
export const readQrFromImageFile = async (file) => {
  const image = await loadImage(file);

  console.groupCollapsed(
    `Đọc QR CCCD: ảnh ${image.width}x${image.height}, ${file.type}`,
  );

  try {
    const native = await decodeWithBarcodeDetector(image);
    console.info(
      "BarcodeDetector:",
      "BarcodeDetector" in window
        ? native
          ? "ĐỌC ĐƯỢC"
          : "không thấy"
        : "trình duyệt không hỗ trợ",
    );

    if (native) return native;

    const wasmText = await decodeWithWasm(file, image);
    if (wasmText) return wasmText;

    const { text, log } = await decodeOnCanvases(image);
    log.forEach((line) => console.info(line));

    return text;
  } finally {
    console.groupEnd();
  }
};