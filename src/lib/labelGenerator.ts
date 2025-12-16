import fs from "fs";
import qr from "qrcode";
import { prisma } from "../../prisma";

// Lazy load canvas only when needed (for Bun compatibility)
let CanvasModule: any = null;
const loadCanvas = async () => {
  if (!CanvasModule) {
    try {
      const imported = await import("canvas");
      CanvasModule = imported.default || imported;
    } catch (error) {
      console.error("Canvas module not available. Label generation will not work.");
      throw new Error("Canvas module required for label generation is not available");
    }
  }
  return CanvasModule;
};

const generateLabel = async (uid: string, layout: 0 | 1 = 0) => {
  // Load canvas dynamically
  const CanvasModule = await loadCanvas();
  const currentBundle = await prisma.bundle.findUnique({
    where: {
      uid,
    },
  });
  if (!currentBundle) return;
  const currentVariant = await prisma.variant.findUnique({
    where: {
      s_no: currentBundle.vs_no,
    },
  });

  if (!currentVariant) return;
  let x = 0;
  let y = 0;
  let text;
  const canvas = CanvasModule.createCanvas(609, 812);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.fillRect(3, 3, canvas.width - 6, canvas.height - 6);
  // # QR CODE
  const currentQr = await qr.toBuffer(currentBundle.uid, {
    version: 4,
    scale: 5,
    margin: 1,
    errorCorrectionLevel: "H",
  });
  const qrcode = await CanvasModule.loadImage(currentQr);
  ctx.fillStyle = "black";
  ctx.fillRect(6, 6, qrcode.width + 6, qrcode.height + 6);
  x = 9;
  y = 9;
  ctx.drawImage(qrcode, x, y);

  const currYear = currentBundle.modified_at.getFullYear() - 2000;

  // LAYOUT LOGIC
  if (layout == 0) {
    const logo = await CanvasModule.loadImage("./logo.png");
    ctx.drawImage(logo, 21 + qrcode.width, 12, 75 * 5, 80);

    // BOX FOR BUNDLE NUMBER
    ctx.fillStyle = "black";
    ctx.fillRect(21 + qrcode.width, 107, 407, 80);
    ctx.fillStyle = "white";
    ctx.fillRect(qrcode.width + 24, 107 + 3, 407 - 6, 80 - 6);

    ctx.fillStyle = "black";
    // LABLE
    // ctx.font = "15px HackExtraBold NF";
    // text = `BUNDLE NUMBER`;
    // x = qrcode.width + 30;
    // y = 107 + 3 + 20;
    // ctx.fillText(text, x, y);

    // INFO
    ctx.font = "50px Arial Rounded MT Bold";
    let bundleStr = currentBundle.sr_no;
    text = `#${currYear}-${bundleStr}`;
    x = qrcode.width + 37;
    y = 107 + 3 + 45 + 10 + 10;
    ctx.fillText(text, x, y);
  } else {
    // FULL BOX

    ctx.fillStyle = "black";
    ctx.fillRect(21 + qrcode.width, 9, 407, 160 + 18);
    ctx.fillStyle = "white";
    ctx.fillRect(qrcode.width + 24, 9 + 3, 407 - 6, 160 + 18 - 6);

    ctx.fillStyle = "black";
    // LABEL
    // ctx.font = "15px HackExtraBold NF";
    // text = `BUNDLE NUMBER`;
    // x = qrcode.width + 30;
    // y = 9 + 6 + 15;
    // ctx.fillText(text, x, y);

    // INFO

    ctx.font = "65px Arial Rounded MT Bold";
    let bundleStr = currentBundle.sr_no;
    text = `#${currYear}-${bundleStr}`;
    x = qrcode.width + 37;
    y = 27 + 3 + 45 + 10 + 10 + 30;
    ctx.fillText(text, x, y, 345);
  }

  // FILL BLACK

  ctx.fillStyle = "black";
  ctx.fillRect(
    6,
    qrcode.height + 18,
    canvas.width - 12,
    canvas.height - qrcode.height - 42
  );

  // LEFT

  // # FIRST ROW
  ctx.fillStyle = "white";
  ctx.fillRect(
    6 + 3,
    qrcode.height + 18 + 3,
    (canvas.width - 12 - 6) / 2 - 1.5 + (canvas.width - 12 - 6) / 2 - 1.5 + 3,
    (canvas.height - qrcode.height - 24 - 9) / 5 - 6
  );

  // # SECOND ROW

  // LEFT COLUMN
  ctx.fillRect(
    6 + 3,
    qrcode.height + 18 + 3 + (115.4 + 3) * 1,
    (canvas.width - 12 - 6) / 2 - 1.5,
    (canvas.height - qrcode.height - 24 - 9) / 5 - 6
  );

  // RIGHT COLUMN
  ctx.fillRect(
    6 + 3 + ((canvas.width - 12 - 6) / 2 + 1.5),
    qrcode.height + 18 + 3 + (115.4 + 3) * 1,
    (canvas.width - 12 - 6) / 2 - 1.5,
    (canvas.height - qrcode.height - 24 - 9) / 5 - 6
  );

  // # THIRD ROW

  // LEFT COLUMN
  ctx.fillRect(
    6 + 3,
    qrcode.height + 18 + 3 + (115.4 + 3) * 2,
    (canvas.width - 12 - 6) / 2 - 1.5,
    (canvas.height - qrcode.height - 24 - 9) / 5 - 6
  );

  //RIGHT COLUMN
  ctx.fillRect(
    6 + 3 + ((canvas.width - 12 - 6) / 2 + 1.5),
    qrcode.height + 18 + 3 + (115.4 + 3) * 2,
    (canvas.width - 12 - 6) / 2 - 1.5,
    (canvas.height - qrcode.height - 24 - 9) / 5 - 6
  );

  // # FOURTH ROW

  // LEFT COLUMN
  ctx.fillRect(
    6 + 3,
    qrcode.height + 18 + 3 + (115.4 + 3) * 3,
    (canvas.width - 12 - 6) / 2 - 1.5,
    (canvas.height - qrcode.height - 24 - 9) / 5 - 6
  );

  //RIGHT COLUMN
  ctx.fillRect(
    6 + 3 + ((canvas.width - 12 - 6) / 2 + 1.5),
    qrcode.height + 18 + 3 + (115.4 + 3) * 3,
    (canvas.width - 12 - 6) / 2 - 1.5,
    (canvas.height - qrcode.height - 24 - 9) / 5 - 6
  );

  //FIFTH ROW

  // LEFT COLUMN
  ctx.fillRect(
    6 + 3,
    qrcode.height + 18 + 3 + (115.4 + 3) * 4,
    (canvas.width - 12 - 6) / 2 - 1.5,
    (canvas.height - qrcode.height - 24 - 9) / 5 - 6
  );

  // RIGHT COLUMN
  ctx.fillRect(
    6 + 3 + ((canvas.width - 12 - 6) / 2 + 1.5),
    qrcode.height + 18 + 3 + (115.4 + 3) * 4,
    (canvas.width - 12 - 6) / 2 - 1.5,
    (canvas.height - qrcode.height - 24 - 9) / 5 - 6
  );

  const wtrng_pc = currentBundle.weight / currentBundle.quantity;

  const wtrng_12 = (wtrng_pc / currentBundle.length) * 12;

  const addLabels = () => {
    ctx.fillStyle = "black";
    ctx.font = "18px JetBrainsMono NF";

    // # FIRST ROW
    text = `ITEM NAME`;
    x = 6 + 3 + 3 + 3;
    y = qrcode.height + 18 + 3 + 16 + 3;
    ctx.fillText(text, x, y);

    // # SECOND ROW

    // LEFT COLUMN
    text = `SECTION NUMBER`;
    x = 6 + 3 + 3 + 3;
    y = qrcode.height + 18 + 3 + 16 + 3 + (115.4 + 3) * 1;
    ctx.fillText(text, x, y);

    // RIGHT COLUMN
    text = `SERIES`;
    x = (canvas.width - 12 - 6) / 2 - 1.5 + 18;
    y = qrcode.height + 18 + 3 + 16 + 3 + (115.4 + 3) * 1;
    ctx.fillText(text, x, y);

    // # THIRD ROW

    // LEFT COLUMN
    text = `QUANTITY`;
    x = 6 + 3 + 3 + 3;
    y = qrcode.height + 18 + 3 + 16 + 3 + (115.4 + 3) * 2;
    ctx.fillText(text, x, y);

    // RIGHT COLUMN
    text = `WEIGHT PER 12ft`;
    x = (canvas.width - 12 - 6) / 2 - 1.5 + 18;
    y = qrcode.height + 18 + 3 + 16 + 3 + (115.4 + 3) * 2;
    ctx.fillText(text, x, y);

    // # FOURTH ROW

    // LEFT COLUMN
    text = `CUT LENGTH`;
    x = 6 + 3 + 3 + 3;
    y = qrcode.height + 18 + 3 + 16 + 3 + (115.4 + 3) * 3;
    ctx.fillText(text, x, y);

    // RIGHT COLUMN
    text = `WEIGHT PER ${currentBundle.length}ft`;
    x = (canvas.width - 12 - 6) / 2 - 1.5 + 18;
    y = qrcode.height + 18 + 3 + 16 + 3 + (115.4 + 3) * 3;
    ctx.fillText(text, x, y);

    // # FIFTH ROW
    text = `TOTAL WEIGHT`;
    x = 6 + 3 + 3 + 3;
    y = qrcode.height + 18 + 3 + 16 + 3 + (115.4 + 3) * 4;
    ctx.fillText(text, x, y);
  };

  const addInfo = () => {
    ctx.fillStyle = "black";

    // # FIRST ROW

    ctx.font = "50px Arial Rounded MT Bold";
    text = `${currentVariant.name}`;
    x = canvas.width / 2 - 14 - 550 / 2;
    y = qrcode.height + 18 + 3 + 16 + 3 + 45 + 20;
    ctx.fillText(text, x, y, 550);

    // # SECOND ROW

    // LEFT COLUMN
    text = `${currentVariant.s_no}`;
    x = canvas.width / 4 - 275 / 2;
    y = qrcode.height + 18 + 3 + 16 + 3 + 50 + 15 + (115.4 + 3) * 1;
    ctx.fillText(text, x, y, 275);

    // RIGHT COLUMN
    text = `${currentVariant.print_series}`;
    x = canvas.width * 0.75 + 3 - 295 / 2;
    y = qrcode.height + 18 + 3 + 16 + 3 + 50 + 15 + (115.4 + 3) * 1;
    ctx.fillText(text, x, y, 290);

    // # THIRD ROW

    // LEFT COLUMN

    text = `${currentBundle.quantity} pcs`;
    x = canvas.width / 4 - 275 / 2;
    y = qrcode.height + 18 + 3 + 16 + 3 + 50 + 20 + (115.4 + 3) * 2;
    ctx.fillText(text, x, y, 275);

    // RIGHT COLUMN

    text = `${wtrng_12.toFixed(3)} kg`;
    x = canvas.width * 0.75 + 3 - 295 / 2;
    y = qrcode.height + 18 + 3 + 16 + 3 + 50 + 20 + (115.4 + 3) * 2;
    ctx.fillText(text, x, y, 285);

    // # FOURTH ROW

    // LEFT COLUMN

    text = `${currentBundle.length.toFixed(3)} ft`;
    x = canvas.width / 4 - 275 / 2;
    y = qrcode.height + 18 + 3 + 16 + 3 + 50 + 20 + (115.4 + 3) * 3;
    ctx.fillText(text, x, y, 275);

    // RIGHT COLUMN

    text = `${wtrng_pc.toFixed(3)} kg`;
    x = canvas.width * 0.75 + 3 - 295 / 2;
    y = qrcode.height + 18 + 3 + 16 + 3 + 50 + 20 + (115.4 + 3) * 3;
    ctx.fillText(text, x, y, 285);

    // # FIFTH ROW

    text = `${currentBundle.weight.toFixed(3)} kg`;
    x = canvas.width / 4 - 275 / 2;
    y = qrcode.height + 18 + 3 + 3 + 16 + 3 + 50 + 20 + (115.4 + 3) * 4;
    ctx.fillText(text, x, y, 275);
  };

  addInfo();
  addLabels();

  // ctx.fillStyle = "black";
  // ctx.font = "18px Iosevka";
  // text = `SOMETHING`;
  // x = (canvas.width - 12 - 6) / 2 - 1.5 + 18;
  // y = qrcode.height + 18 + 3 + 16 + 3 + (115.4 + 3) * 4;
  // ctx.fillText(text, x, y);
  // ctx.fillStyle = "white";

  //   ctx.font = "25px TerminessTTF NF";
  //   text = `
  // Item Name  : ${currentVariant.name}
  // Section No.: ${currentVariant.s_no}
  // Series     : ${currentVariant.series}
  // Wt. Rng.   : [${JSON.parse(currentVariant.range).start}-${
  //     JSON.parse(currentVariant.range).end
  //   }]/12'
  // Quanitity  : ${currentBundle.quantity} pcs.
  // Cut Length : ${currentBundle.length} ft.
  // Total Wt.  : ${currentBundle.weight} kg`;
  //   ctx.fillText(text, 9, qrcode.height + 18);

  const lableBuffer = canvas.toBuffer("image/png");
  if (layout == 0) {
    fs.writeFileSync(`./cache/${currentBundle.uid}.png`, lableBuffer);
    fs.exists(`./cache/${currentBundle.uid}.png`, (e) => {
      return 1;
    });
  } else if (layout == 1) {
    fs.writeFileSync(`./cache/${currentBundle.uid}_alt.png`, lableBuffer);
    fs.exists(`./cache/${currentBundle.uid}_alt.png`, (e) => {
      return 1;
    });
  }
};

export { generateLabel };
