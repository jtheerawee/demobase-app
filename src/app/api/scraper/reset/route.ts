import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const franchise = searchParams.get("franchise");
    const language = searchParams.get("language");
    const scrapedIndex = searchParams.get("index");

    if (!franchise || !language) {
        return NextResponse.json(
            {
                success: false,
                error: "Franchise and language are required",
            },
            { status: 400 },
        );
    }

    try {
        const supabase = await createClient();

        let query = supabase
            .from("scraped_collections")
            .delete({ count: "exact" })
            .eq("franchise", franchise)
            .eq("language", language);

        if (scrapedIndex) {
            query = query.eq("scraped_index", scrapedIndex);
        }

        const { error, count } = await query;

        if (error) {
            console.error("Delete error:", error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 },
            );
        }

        return NextResponse.json({ success: true, count });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 },
        );
    }
}
