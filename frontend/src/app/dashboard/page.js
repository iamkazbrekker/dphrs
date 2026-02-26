"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
export default function DashboardRoot() {
    const router = useRouter();
    useEffect(() => { router.replace("/dashboard/patient"); }, []);
    return null;
}
