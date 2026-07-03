import AdminEventDetail from "@/app/admin/events/[id]/AdminEventDetail";

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AdminEventDetail id={id} />;
}
