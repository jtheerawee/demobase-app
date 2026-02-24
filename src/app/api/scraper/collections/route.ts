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
            .select("id, name, collection_code, image_url, collection_url, scraped_cards(count)")
            .order("name", { ascending: true });

        if (franchise) {
            query = query.eq("franchise", franchise);
        }
        if (language) {
            query = query.eq("language", language);
        }

        const { data, error } = await query;

        if (error) {
            console.error("[API] Error fetching collections:", error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        const collections = data.map((col: any) => ({
            id: col.id,
            name: col.name,
            collectionCode: col.collection_code,
            imageUrl: col.image_url,
            collectionUrl: col.collection_url,
            cardCount: col.scraped_cards?.[0]?.count || 0,
        }));

        return NextResponse.json({
            success: true,
            collections,
        });
    } catch (err: any) {
        console.error("[API] Unexpected error fetching collections:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const franchise = searchParams.get("franchise");
    const language = searchParams.get("language");
    const id = searchParams.get("id");

    if (!id && !franchise) {
        return NextResponse.json({ success: false, error: "Franchise or ID is required" }, { status: 400 });
    }

    try {
        const supabase = await createClient();

        let query = supabase
            .from("scraped_collections")
            .delete();

        if (id) {
            query = query.eq("id", id);
        } else {
            query = query.eq("franchise", franchise);
            if (language) {
                query = query.eq("language", language);
            }
        }

        const { error } = await query;

        if (error) {
            console.error("[API] Error deleting collections:", error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: "Collections deleted successfully",
        });
    } catch (err: any) {
        console.error("[API] Unexpected error deleting collections:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
