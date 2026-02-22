import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const supabase = await createClient();

  await supabase.auth.signOut();

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_SITE_URL}/${locale}`,
    { status: 303 },
  );
}
