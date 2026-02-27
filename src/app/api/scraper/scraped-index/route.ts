import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const franchise = searchParams.get("franchise");
    const language = searchParams.get("language");

    try {
        const supabase = await createClient();

        let query = supabase
            .from("scraped_collections")
            .select("scraped_index")
            .order("scraped_index", { ascending: false });

        if (franchise) {
            query = query.eq("franchise", franchise);
        }
        if (language) {
            query = query.eq("language", language);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 },
            );
        }

        const indices = Array.from(
            new Set(data.map((item) => item.scraped_index)),
        ).sort((a, b) => b - a);
        const maxIndex = indices.length > 0 ? indices[0] : 0;

        return NextResponse.json({
            success: true,
            maxIndex,
            indices,
        });
    } catch (err: any) {
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 },
        );
    }
}
