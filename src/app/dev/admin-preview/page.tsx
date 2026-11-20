import { notFound } from "next/navigation";
import { AdminPreview } from "@/components/admin/AdminPreview";

// 16: 관리자 UI를 실서버 없이 보는 개발용 미리보기. production에서는 404(/dev와 같은 규칙).
export default function AdminPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <AdminPreview />;
}
