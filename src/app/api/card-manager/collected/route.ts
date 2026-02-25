import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { data, error } = await supabase
            .from("collected_cards")
            .select(`
                id,
                quantity,
                condition,
                variant,
                card_id,
                scraped_cards (
                    name,
                    image_url,
                    card_no,
                    rarity,
                    scraped_collections (
                        id,
                        name,
                        franchise
                    )
                )
            `)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        const cards = data.map((item: any) => ({
            id: item.id,
            cardId: item.card_id,
            collectionId: item.scraped_cards?.scraped_collections?.id,
            name: item.scraped_cards?.name,
            imageUrl: item.scraped_cards?.image_url,
            cardNo: item.scraped_cards?.card_no,
            rarity: item.scraped_cards?.rarity,
            collectionName: item.scraped_cards?.scraped_collections?.name,
            franchise: item.scraped_cards?.scraped_collections?.franchise,
            quantity: item.quantity,
            variant: item.variant,
            condition: item.condition
        }));

        return NextResponse.json({ success: true, cards });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { cardId, variant, condition, noIncrement } = await request.json();

        // Upsert logic: if user+card+variant+condition matches, increment quantity
        // Since we have a unique constraint, we can use upsert with expression for quantity
        // But Supabase client doesn't support expressions in upsert easily without RPC
        // So we'll do: Check exists -> Insert or Update

        const { data: existing } = await supabase
            .from("collected_cards")
            .select("id, quantity")
            .eq("user_id", user.id)
            .eq("card_id", cardId)
            .eq("variant", variant || null)
            .eq("condition", condition || 'NM')
            .single();

        if (existing) {
            if (!noIncrement) {
                const { error: updateError } = await supabase
                    .from("collected_cards")
                    .update({ quantity: existing.quantity + 1 })
                    .eq("id", existing.id);

                if (updateError) throw updateError;
            }
        } else {
            const { error: insertError } = await supabase
                .from("collected_cards")
                .insert({
                    user_id: user.id,
                    card_id: cardId,
                    quantity: 1,
                    variant: variant || null,
                    condition: condition || 'NM'
                });

            if (insertError) throw insertError;
        }

        return NextResponse.json({ success: true, alreadyInCollection: !!existing });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!user || !id) {
            return NextResponse.json({ success: false, error: "Missing ID or unauthorized" }, { status: 400 });
        }

        const { error } = await supabase
            .from("collected_cards")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { id, quantity, condition, variant } = await request.json();

        if (!id) {
            return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 });
        }

        const updateData: any = {};
        if (quantity !== undefined && quantity >= 1) updateData.quantity = quantity;
        if (condition !== undefined) updateData.condition = condition;
        if (variant !== undefined) updateData.variant = variant;

        const { error } = await supabase
            .from("collected_cards")
            .update(updateData)
            .eq("id", id)
            .eq("user_id", user.id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
