"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminEventsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin");
  }, [router]);
  return <div className="p-8 font-bold">Redirecting to admin dashboard...</div>;
}

