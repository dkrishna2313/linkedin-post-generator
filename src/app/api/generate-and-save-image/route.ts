import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const defaultWorkspaceId = "default-workspace";

const requestSchema = z.object({
  prompt: z.string().trim().min(1),
  provider: z.enum(["gemini", "openai"]).default("gemini"),
  aspectRatio: z.string().trim().min(1).default("4:5"),
  postId: z.string().trim().optional()
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "A generated image prompt is required." }, { status: 400 });
  }

  const { prompt, provider, aspectRatio, postId } = parsed.data;

  try {
    const result =
      provider === "gemini"
        ? await generateGeminiImage(prompt)
        : await generateOpenAIImage(prompt, aspectRatio);

    await prisma.workspace.upsert({
      where: { id: defaultWorkspaceId },
      update: {},
      create: { id: defaultWorkspaceId, name: "Dilip LinkedIn Studio" }
    });

    const dir = path.join(process.cwd(), "storage", "uploads", "generated-images");
    await mkdir(dir, { recursive: true });

    const filename = `${Date.now()}-${provider}.${result.extension}`;
    const diskPath = path.join(dir, filename);
    const publicPath = `/api/generated-images/${filename}`;
    await writeFile(diskPath, Buffer.from(result.base64, "base64"));

    const image = await prisma.generatedImage.create({
      data: {
        workspaceId: defaultWorkspaceId,
        provider,
        model: result.model,
        prompt,
        imagePath: publicPath,
        postId: postId || null
      }
    });

    return NextResponse.json({
      image: {
        id: image.id,
        provider: image.provider,
        model: image.model,
        prompt: image.prompt,
        imagePath: image.imagePath,
        postId: image.postId,
        createdAt: image.createdAt
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Image could not be generated."
      },
      { status: 500 }
    );
  }
}

async function generateGeminiImage(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.DEFAULT_IMAGE_MODEL || "gemini-3.1-flash-image-preview";

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"]
        }
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message ?? `Gemini image generation failed with ${response.status}.`);
  }

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((part: { inlineData?: { data?: string }; inline_data?: { data?: string } }) => {
    return part.inlineData?.data || part.inline_data?.data;
  });
  const inlineData = imagePart?.inlineData ?? imagePart?.inline_data;

  if (!inlineData?.data) {
    throw new Error("Gemini did not return image data. Try a simpler prompt or a different image model.");
  }

  return {
    base64: inlineData.data,
    extension: extensionFromMime(inlineData.mimeType ?? inlineData.mime_type ?? "image/png"),
    model
  };
}

async function generateOpenAIImage(prompt: string, aspectRatio: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.DEFAULT_IMAGE_MODEL || "gpt-image-1";

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const client = new OpenAI({ apiKey });
  const response = await client.images.generate({
    model,
    prompt,
    size: openAIImageSize(aspectRatio),
    n: 1
  });

  const image = response.data?.[0];
  const base64 = image && "b64_json" in image ? image.b64_json : undefined;

  if (!base64) {
    throw new Error("OpenAI did not return base64 image data.");
  }

  return { base64, extension: "png", model };
}

function openAIImageSize(aspectRatio: string) {
  if (aspectRatio === "16:9" || aspectRatio === "1.91:1") return "1536x1024";
  if (aspectRatio === "4:5") return "1024x1536";
  return "1024x1024";
}

function extensionFromMime(mime: string) {
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  return "png";
}
