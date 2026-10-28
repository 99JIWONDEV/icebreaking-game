import { notFound } from "next/navigation";
import { DevPanel } from "@/components/DevPanel";

export default function DevPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <DevPanel />;
}
