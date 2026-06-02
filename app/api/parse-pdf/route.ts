import { NextResponse } from "next/server";
import { PdfReader } from "pdfreader";

export const runtime = "nodejs";

type PdfTextItem = {
  text?: string;
  x?: number;
  y?: number;
};

function readPdfText(buffer: Buffer) {
  return new Promise<string>((resolve, reject) => {
    const rows: Record<string, string[]> = {};

    new PdfReader().parseBuffer(buffer, (error, item: PdfTextItem | null) => {
      if (error) {
        reject(error);
        return;
      }

      if (!item) {
        const text = Object.keys(rows)
          .sort((a, b) => Number(a) - Number(b))
          .map((key) => rows[key].join(" "))
          .join("\n");

        resolve(text);
        return;
      }

      if (item.text && typeof item.y === "number") {
        const rowKey = item.y.toFixed(2);
        rows[rowKey] = rows[rowKey] || [];
        rows[rowKey].push(item.text);
      }
    });
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请上传 PDF 文件" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await readPdfText(buffer);
    console.log("PDF text length:", text.trim().length);

    return NextResponse.json({ text });
  } catch (error) {
    console.error("PDF parse error:", error);
    return NextResponse.json({ error: "PDF 读取接口报错" }, { status: 500 });
  }
}
