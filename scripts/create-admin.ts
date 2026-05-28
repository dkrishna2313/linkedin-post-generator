import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db/prisma";
import { defaultVoiceProfile, sensitiveTopics, viewpoints } from "../src/lib/data/seed";

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.ADMIN_PASSWORD ?? "change-me-now";
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, name: "Dilip Krishna", passwordHash }
  });

  const workspace = await prisma.workspace.upsert({
    where: { id: "default-workspace" },
    update: {},
    create: { id: "default-workspace", name: "Dilip LinkedIn Studio" }
  });

  await prisma.workspaceMember.upsert({
    where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
    update: { role: "owner" },
    create: { userId: user.id, workspaceId: workspace.id, role: "owner" }
  });

  for (const [index, item] of viewpoints.entries()) {
    await prisma.viewpoint.upsert({
      where: { id: `seed-viewpoint-${index}` },
      update: item,
      create: {
        id: `seed-viewpoint-${index}`,
        workspaceId: workspace.id,
        priority: index + 1,
        ...item
      }
    });
  }

  for (const [index, item] of sensitiveTopics.entries()) {
    await prisma.sensitiveTopic.upsert({
      where: { id: `seed-sensitive-${index}` },
      update: {
        topic: item.topic,
        guidance: item.guidance,
        phrasesToAvoid: item.avoid,
        requiredCaveats: item.caveats
      },
      create: {
        id: `seed-sensitive-${index}`,
        workspaceId: workspace.id,
        topic: item.topic,
        guidance: item.guidance,
        phrasesToAvoid: item.avoid,
        requiredCaveats: item.caveats
      }
    });
  }

  await prisma.voiceProfile.upsert({
    where: { id: "seed-voice-profile" },
    update: {},
    create: {
      id: "seed-voice-profile",
      workspaceId: workspace.id,
      name: "Default voice profile",
      summary: defaultVoiceProfile.tone,
      styleRules: defaultVoiceProfile
    }
  });

  console.log(`Admin ready: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
