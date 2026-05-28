import { DraftEditorClient } from "@/components/DraftEditorClient";

export default async function DraftEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DraftEditorClient postId={id} />;
}
