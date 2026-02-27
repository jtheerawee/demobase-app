"use client";

import {
    ActionIcon,
    Badge,
    Card,
    Group,
    Image,
    ScrollArea,
    SimpleGrid,
    Stack,
    Text,
} from "@mantine/core";
import {
    IconExternalLink,
    IconTrash,
} from "@tabler/icons-react";
import JSZip from "jszip";
import { useMemo, useState } from "react";
import { CardScraperCount } from "./CardScraperCount";
import { ScrapedCardIcons } from "./ScrapedCardIcons";

interface CardItem {
    id: string | number;
    name: string;
    cardNo?: string;
    rarity?: string;
    imageUrl: string;
    cardUrl?: string;
}

interface CardScraperCardListProps {
    cards?: CardItem[];
    collectionCode?: string;
    loading?: boolean;
    onDeleteCard?: (id: string | number) => void;
    onDeleteAllCards?: () => void;
    onDownloadCards?: () => void;
    onDownloadAllImages?: () => void;
    onRefresh?: () => void;
    canDownload?: boolean;
}

export function CardScraperCardList({
    cards = [],
    collectionCode,
    loading,
    onDeleteCard,
    onDeleteAllCards,
    onDownloadCards,
    onDownloadAllImages,
    onRefresh,
    canDownload,
}: CardScraperCardListProps) {
    const [filterInvalid, setFilterInvalid] = useState(false);
    const [bulkDownloading, setBulkDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState({
        current: 0,
        total: 0,
    });

    const filteredCards = useMemo(() => {
        if (!filterInvalid) return cards;
        return cards.filter((c) => !c.rarity);
    }, [cards, filterInvalid]);

    const invalidCount = useMemo(
        () => cards.filter((c) => !c.rarity).length,
        [cards],
    );

    const downloadImage = async (card: CardItem) => {
        try {
            const response = await fetch(card.imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${card.cardNo || "card"}-${card.name.replace(/\s+/g, "_")}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (e) {
            window.open(card.imageUrl, "_blank");
        }
    };

    const handleDownloadAll = async () => {
        if (filteredCards.length === 0) return;
        setBulkDownloading(true);
        setDownloadProgress({
            current: 0,
            total: filteredCards.length,
        });

        const zip = new JSZip();
        const folderName = collectionCode || "cards";
        const imgFolder = zip.folder(folderName);

        for (let i = 0; i < filteredCards.length; i++) {
            const card = filteredCards[i];
            try {
                const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(card.imageUrl)}`;
                const response = await fetch(proxyUrl);
                if (!response.ok) throw new Error("Failed to fetch image");
                const blob = await response.blob();
                const prefix = collectionCode ? `[${collectionCode}]-` : "";
                const fileName = `${prefix}${card.cardNo || "card"}-${card.name.replace(/\s+/g, "_")}.png`;
                imgFolder?.file(fileName, blob);
            } catch (error) {
                console.error(`Error adding ${card.name} to zip:`, error);
            }
            setDownloadProgress({
                current: i + 1,
                total: filteredCards.length,
            });
        }

        try {
            const content = await zip.generateAsync({
                type: "blob",
            });
            const url = window.URL.createObjectURL(content);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${folderName}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error generating zip:", error);
        }

        setBulkDownloading(false);
        setDownloadProgress({ current: 0, total: 0 });
    };

    return (
        <Card withBorder radius="sm" padding="sm" shadow="sm" h="100%" style={{ display: "flex", flexDirection: "column" }}>
            <Stack gap="md" style={{ flex: 1, minHeight: 0 }}>
                <Group justify="space-between">
                    <CardScraperCount
                        label={`Scraped Cards ${collectionCode ? `(${collectionCode})` : ""}`}
                        count={filteredCards.length}
                        subLabel={filterInvalid ? "Invalid" : "Cards"}
                        color={filterInvalid ? "orange" : "blue"}
                    />
                </Group>
                <ScrapedCardIcons
                    onDownloadCards={onDownloadCards}
                    onDownloadAllImages={handleDownloadAll}
                    onRefresh={onRefresh}
                    onDeleteAllCards={onDeleteAllCards}
                    filterInvalid={filterInvalid}
                    onFilterInvalidToggle={() => setFilterInvalid(!filterInvalid)}
                    loading={loading}
                    bulkDownloading={bulkDownloading}
                    downloadProgress={downloadProgress}
                    canDownload={canDownload}
                    cardsCount={cards.length}
                    invalidCount={invalidCount}
                />

                <ScrollArea style={{ flex: 1, minHeight: 0 }} pt="xs">
                    <SimpleGrid cols={1} spacing="xs">
                        {filteredCards.map((card, index) => (
                            <Card
                                key={card.id || index}
                                withBorder
                                padding={4}
                                radius="xs"
                                style={{
                                    position: "relative",
                                }}
                            >
                                <ActionIcon
                                    variant="subtle"
                                    color="red"
                                    size="xs"
                                    onClick={() => onDeleteCard?.(card.id)}
                                    style={{
                                        position: "absolute",
                                        top: 2,
                                        right: 2,
                                        zIndex: 10,
                                        backgroundColor:
                                            "rgba(255,255,255,0.8)",
                                    }}
                                    title="Delete Card"
                                >
                                    <IconTrash size={12} />
                                </ActionIcon>

                                {card.cardUrl && (
                                    <ActionIcon
                                        variant="subtle"
                                        color="blue"
                                        size="xs"
                                        component="a"
                                        href={card.cardUrl}
                                        target="_blank"
                                        style={{
                                            position: "absolute",
                                            top: 2,
                                            right: 22,
                                            zIndex: 10,
                                            backgroundColor:
                                                "rgba(255,255,255,0.8)",
                                        }}
                                        title="View Source"
                                    >
                                        <IconExternalLink size={12} />
                                    </ActionIcon>
                                )}

                                <Group gap="xs" wrap="nowrap" align="center">
                                    <Image
                                        src={card.imageUrl}
                                        fallbackSrc="https://placehold.co/100x140?text=No+Image"
                                        alt={card.name}
                                        radius="xs"
                                        w={44}
                                        style={{
                                            aspectRatio: "2.5 / 3.5",
                                            objectFit: "contain",
                                        }}
                                    />
                                    <Stack
                                        gap={2}
                                        style={{
                                            flex: 1,
                                            minWidth: 0,
                                        }}
                                    >
                                        <Text size="xs" fw={700} lineClamp={1}>
                                            {card.name}
                                        </Text>
                                        <Group gap={4}>
                                            <Badge
                                                size="9px"
                                                variant="light"
                                                color="blue"
                                                radius="xs"
                                                px={4}
                                                h={14}
                                            >
                                                No: {card.cardNo || "---"}
                                            </Badge>
                                            <Badge
                                                size="9px"
                                                variant="outline"
                                                color="gray"
                                                radius="xs"
                                                px={4}
                                                h={14}
                                            >
                                                {card.rarity || "---"}
                                            </Badge>
                                        </Group>
                                    </Stack>
                                </Group>
                            </Card>
                        ))}
                    </SimpleGrid>
                    {cards.length === 0 && !loading && (
                        <Text size="sm" c="dimmed" ta="center" py="xl">
                            {canDownload
                                ? "Download items to see cards."
                                : "Select a collection first."}
                        </Text>
                    )}
                    {loading && (
                        <Text size="sm" c="dimmed" ta="center" py="xl">
                            Scraping cards...
                        </Text>
                    )}
                </ScrollArea>
            </Stack>
        </Card>
    );
}
