"use client";

import { Card, SimpleGrid, Image, Text, Stack, Group, Badge, ScrollArea } from "@mantine/core";

interface CardItem {
    id: string;
    name: string;
    cardNumber: string;
    rarity: string;
    imageUrl: string;
}

const MOCK_CARDS: CardItem[] = [
    {
        id: "1",
        name: "Pikachu ex",
        cardNumber: "013/011",
        rarity: "SAR",
        imageUrl: "https://images.pokemontcg.io/sv3/1.png"
    },
    {
        id: "2",
        name: "Charizard ex",
        cardNumber: "199/165",
        rarity: "SAR",
        imageUrl: "https://images.pokemontcg.io/sv3pt5/199.png"
    },
    {
        id: "3",
        name: "Black Lotus",
        cardNumber: "PR-3",
        rarity: "Rare",
        imageUrl: "https://cards.scryfall.io/large/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.jpg?1614638838"
    },
    {
        id: "4",
        name: "Luffy Gear 5",
        cardNumber: "OP05-119",
        rarity: "SEC",
        imageUrl: "https://onepiece-cardgame.dev/cards/op05/OP05-119_p1.png"
    }
];

export function CardScraperCardList() {
    return (
        <Card withBorder radius="md" padding="md" shadow="sm">
            <Stack gap="md">
                <Group justify="space-between">
                    <Text fw={600}>Scraped Cards</Text>
                    <Badge variant="light" color="gray">
                        Preview
                    </Badge>
                </Group>

                <ScrollArea h={400} offsetScrollbars>
                    <SimpleGrid cols={2} spacing="xs">
                        {MOCK_CARDS.map((card) => (
                            <Card key={card.id} withBorder padding="xs" radius="sm">
                                <Stack gap="xs">
                                    <Image
                                        src={card.imageUrl}
                                        fallbackSrc="https://placehold.co/200x280?text=No+Image"
                                        alt={card.name}
                                        radius="xs"
                                    />
                                    <Stack gap={2}>
                                        <Text size="xs" fw={700} lineClamp={1}>
                                            {card.name}
                                        </Text>
                                        <Group justify="space-between">
                                            <Text size="10px" c="dimmed">
                                                {card.cardNumber}
                                            </Text>
                                            <Badge size="xs" variant="outline" radius="xs">
                                                {card.rarity}
                                            </Badge>
                                        </Group>
                                    </Stack>
                                </Stack>
                            </Card>
                        ))}
                    </SimpleGrid>
                </ScrollArea>
            </Stack>
        </Card>
    );
}
