import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function GET() {
    const headerList = await headers();

    // Check various headers where IP might be stored
    const forwarded = headerList.get("x-forwarded-for");
    const realIp = headerList.get("x-real-ip");

    let ip = "127.0.0.1";

    if (forwarded) {
        ip = forwarded.split(",")[0].trim();
    } else if (realIp) {
        ip = realIp;
    }

    return NextResponse.json({ ip });
}
