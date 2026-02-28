import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const collectionId = searchParams.get("collectionId");

    if (!collectionId) {
        return NextResponse.json(
            {
                success: false,
                error: "Missing collectionId",
            },
            { status: 400 },
        );
    }

    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("scraped_cards")
            .select("id, name, image_url, card_url, card_no, rarity")
            .eq("collection_id", collectionId)
            .order("id", { ascending: true });

        if (error) {
            console.error("[API] Error fetching cards:", error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        const cards = data.map((card) => ({
            id: card.id,
            name: card.name,
            imageUrl: card.image_url,
            cardUrl: card.card_url,
            cardNo: card.card_no,
            rarity: card.rarity,
        }));

        return NextResponse.json({
            success: true,
            cards,
        });
    } catch (err: any) {
        console.error("[API] Unexpected error fetching cards:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const collectionId = searchParams.get("collectionId");

    if (!id && !collectionId) {
        return NextResponse.json(
            {
                success: false,
                error: "Missing id or collectionId",
            },
            { status: 400 },
        );
    }

    try {
        const supabase = await createClient();
        let query = supabase.from("scraped_cards").delete();

        if (id) {
            query = query.eq("id", id);
        } else if (collectionId) {
            query = query.eq("collection_id", collectionId);
        }

        const { error } = await query;

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
