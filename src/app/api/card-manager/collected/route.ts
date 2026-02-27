import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 },
            );
        }

        const { data, error } = await supabase
            .from("collected_cards")
            .select(
                `
                id,
                quantity,
                condition,
                variant,
                card_id,
                scraped_cards (
                    name,
                    image_url,
                    card_url,
                    card_no,
                    rarity,
                    scraped_collections (
                        id,
                        name,
                        collection_code,
                        franchise
                    )
                )
            `,
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        const cards = data.map((item: any) => ({
            id: item.id,
            cardId: item.card_id,
            collectionId:
                item.scraped_cards?.scraped_collections?.id,
            name: item.scraped_cards?.name,
            imageUrl: item.scraped_cards?.image_url,
            cardUrl: item.scraped_cards?.card_url,
            cardNo: item.scraped_cards?.card_no,
            rarity: item.scraped_cards?.rarity,
            collectionName:
                item.scraped_cards?.scraped_collections
                    ?.name,
            collectionCode:
                item.scraped_cards?.scraped_collections
                    ?.collection_code,
            franchise:
                item.scraped_cards?.scraped_collections
                    ?.franchise,
            quantity: item.quantity,
            variant: item.variant,
            condition: item.condition,
        }));

        return NextResponse.json({ success: true, cards });
    } catch (err: any) {
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 },
        );
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 },
            );
        }

        const {
            cardId,
            variant,
            condition,
            checkVariantCondition,
        } = await request.json();

        const variantValue = variant || null;
        const conditionValue = condition || "NM";

        let existingQuery = supabase
            .from("collected_cards")
            .select("id, quantity")
            .eq("user_id", user.id)
            .eq("card_id", cardId);

        if (checkVariantCondition) {
            existingQuery = existingQuery.eq(
                "condition",
                conditionValue,
            );
            existingQuery = variantValue
                ? existingQuery.eq("variant", variantValue)
                : existingQuery.is("variant", null);
        }

        const { data: existing } =
            await existingQuery.maybeSingle();

        if (existing) {
            // already in collection — do nothing
        } else {
            const { error: insertError } = await supabase
                .from("collected_cards")
                .insert({
                    user_id: user.id,
                    card_id: cardId,
                    quantity: 1,
                    variant: variant || null,
                    condition: condition || "NM",
                });

            if (insertError) throw insertError;
        }

        return NextResponse.json({
            success: true,
            alreadyInCollection: !!existing,
        });
    } catch (err: any) {
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 },
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!user || !id) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Missing ID or unauthorized",
                },
                { status: 400 },
            );
        }

        const { error } = await supabase
            .from("collected_cards")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 },
        );
    }
}

export async function PATCH(request: Request) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 },
            );
        }

        const { id, quantity, condition, variant } =
            await request.json();

        if (!id) {
            return NextResponse.json(
                { success: false, error: "Invalid data" },
                { status: 400 },
            );
        }

        const updateData: any = {};
        if (quantity !== undefined && quantity >= 1)
            updateData.quantity = quantity;
        if (condition !== undefined)
            updateData.condition = condition;
        if (variant !== undefined)
            updateData.variant = variant;

        const { error } = await supabase
            .from("collected_cards")
            .update(updateData)
            .eq("id", id)
            .eq("user_id", user.id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 },
        );
    }
}
