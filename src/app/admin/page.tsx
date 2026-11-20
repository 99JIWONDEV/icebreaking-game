import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/AdminApp";

// 16: 앱 어디에도 링크하지 않는다. 검색에도, 캐시에도 남지 않게(next.config.ts의 headers와 이중으로).
export const metadata: Metadata = {
  title: "관리자 · Admin",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminPage() {
  return <AdminApp />;
}
