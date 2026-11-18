"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminProposalsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin");
  }, [router]);
  return <div className="p-8 font-bold">Redirecting to proposals...</div>;
}

