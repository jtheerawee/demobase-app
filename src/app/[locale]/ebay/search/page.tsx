"use client";

import {
    ActionIcon,
    Badge,
    Button,
    Card,
    Center,
    Container,
    Group,
    Image,
    Loader,
    NumberInput,
    Paper,
    SegmentedControl,
    Select,
    SimpleGrid,
    Stack,
    Text,
    TextInput,
    Title,
} from "@mantine/core";
import { IconBolt, IconCoin, IconExternalLink, IconGavel, IconPlus, IconSearch } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import type { EbayItem } from "@/services/ebayService";

const getTimeLeft = (endTime?: string) => {
    if (!endTime) return null;
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return "Ended";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${mins}m left`;
    return `${mins}m left`;
};

export default function EbaySearchPage() {
    const [query, setQuery] = useState("charizard 050");
    const [psa, setPsa] = useState<string>("10");
    const [minPrice, setMinPrice] = useState<number | string>("");
    const [maxPrice, setMaxPrice] = useState<number | string>("");
    const [listingType, setListingType] = useState<string>("AUCTION");
    const [results, setResults] = useState<EbayItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [offset, setOffset] = useState(0);

    const handleSearch = useCallback(
        async (isLoadMore = false) => {
            if (isLoadMore) setLoadingMore(true);
            else {
                setLoading(true);
                setOffset(0);
            }
            setError(null);

            try {
                const currentOffset = isLoadMore ? offset + 10 : 0;
                let url = `/api/ebay/active?q=${encodeURIComponent(query)}&offset=${currentOffset}`;
                if (psa) url += `&psa=${psa}`;
                if (minPrice) url += `&minPrice=${minPrice}`;
                if (maxPrice) url += `&maxPrice=${maxPrice}`;
                if (listingType !== "ALL") url += `&type=${listingType}`;

                const res = await fetch(url);
                if (!res.ok) throw new Error("Search failed");
                const data = await res.json();

                if (isLoadMore) {
                    setResults((prev) => [...prev, ...data]);
                    setOffset(currentOffset);
                } else {
                    setResults(data);
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [query, psa, minPrice, maxPrice, listingType, offset]
    );

    const handleSaveSearch = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/ebay/save-search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query,
                    psaGrade: psa,
                    minPrice: minPrice || null,
                    maxPrice: maxPrice || null,
                    listingType,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to save search");
            }

            alert("Search saved successfully!");
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        const delaySearch = setTimeout(() => {
            handleSearch();
        }, 500); // Debounce keyword typing
        return () => clearTimeout(delaySearch);
    }, [handleSearch]);

    return (
        <Container size="xl" py="xl">
            <Stack gap="xl">
                <Paper
                    p="xl"
                    radius="md"
                    withBorder
                    shadow="sm"
                    bg="rgba(255, 255, 255, 0.8)"
                    style={{ backdropFilter: "blur(10px)" }}
                >
                    <Stack gap="md">
                        <Group justify="space-between">
                            <Group gap="xs">
                                <IconGavel size={32} color="#E67E22" />
                                <Title
                                    order={1}
                                    style={{
                                        background: "linear-gradient(45deg, #E67E22, #D35400)",
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent",
                                    }}
                                >
                                    eBay Market Search
                                </Title>
                            </Group>
                            <Group gap="xs">
                                <Button
                                    variant="light"
                                    color="orange"
                                    leftSection={<IconPlus size={18} />}
                                    onClick={handleSaveSearch}
                                    loading={saving}
                                    radius="md"
                                >
                                    Save Search
                                </Button>
                                <Badge variant="dot" color="orange" size="lg">
                                    Live Data
                                </Badge>
                            </Group>
                        </Group>

                        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                            <TextInput
                                label="Search Keywords"
                                placeholder="e.g. Charizard 050"
                                value={query}
                                onChange={(e) => setQuery(e.currentTarget.value)}
                                leftSection={<IconSearch size={16} />}
                                styles={{ input: { borderRadius: "8px" } }}
                            />
                            <Group grow align="flex-end">
                                <Select
                                    label="PSA Grade"
                                    placeholder="Select grade"
                                    data={["10", "9", "8", "7", "6", "5", "4", "3", "2", "1"]}
                                    value={psa}
                                    onChange={(value) => setPsa(value || "")}
                                    styles={{ input: { borderRadius: "8px" } }}
                                />
                                <NumberInput
                                    label="Min Price"
                                    placeholder="0"
                                    value={minPrice}
                                    onChange={setMinPrice}
                                    leftSection={<IconCoin size={16} />}
                                    styles={{ input: { borderRadius: "8px" } }}
                                />
                                <NumberInput
                                    label="Max Price"
                                    placeholder="9999"
                                    value={maxPrice}
                                    onChange={setMaxPrice}
                                    leftSection={<IconCoin size={16} />}
                                    styles={{ input: { borderRadius: "8px" } }}
                                />
                            </Group>
                        </SimpleGrid>

                        <Group justify="space-between" align="flex-end">
                            <Stack gap={4}>
                                <Text size="sm" fw={500}>
                                    Listing Type & Sort
                                </Text>
                                <SegmentedControl
                                    value={listingType}
                                    onChange={setListingType}
                                    data={[
                                        { label: "Auction (End Soonest)", value: "AUCTION" },
                                        { label: "Fixed Price (Lowest)", value: "FIXED_PRICE" },
                                    ]}
                                    color="orange"
                                    styles={{ root: { borderRadius: "8px" } }}
                                />
                            </Stack>
                            <Button
                                color="orange"
                                onClick={() => handleSearch(false)}
                                loading={loading}
                                size="md"
                                style={{ borderRadius: "8px", paddingLeft: 40, paddingRight: 40 }}
                                leftSection={<IconSearch size={18} />}
                            >
                                Search Now
                            </Button>
                        </Group>
                    </Stack>
                </Paper>

                {error && (
                    <Center py="xl">
                        <Text color="red" fw={500}>
                            {error}
                        </Text>
                    </Center>
                )}

                {loading ? (
                    <Center py={100}>
                        <Stack align="center">
                            <Loader color="orange" size="xl" type="bars" />
                            <Text c="dimmed" size="sm">
                                Hunting for the best deals on eBay...
                            </Text>
                        </Stack>
                    </Center>
                ) : (
                    <>
                        <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} spacing="lg">
                            {results.map((item, index) => {
                                const timeLeft = getTimeLeft(item.endTime);
                                return (
                                    <Card
                                        key={`${item.id}-${index}`}
                                        shadow="sm"
                                        padding="sm"
                                        radius="md"
                                        withBorder
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            transition: "transform 0.2s ease",
                                            cursor: "pointer",
                                            height: "100%",
                                        }}
                                        className="ebay-card"
                                        onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-5px)")}
                                        onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                                    >
                                        <Card.Section>
                                            <Center bg="gray.0" h={250} style={{ overflow: "hidden" }}>
                                                <Image
                                                    src={item.imageUrl}
                                                    alt={item.title}
                                                    fit="contain"
                                                    height="100%"
                                                    fallbackSrc="https://via.placeholder.com/200x250?text=No+Image"
                                                    p="xs"
                                                />
                                            </Center>
                                        </Card.Section>

                                        <Stack mt="md" gap="xs" style={{ flex: 1 }}>
                                            <Group justify="flex-end" gap="xs">
                                                {timeLeft && (
                                                    <Badge
                                                        color={
                                                            timeLeft.includes("left") && !timeLeft.includes("d")
                                                                ? "red"
                                                                : "gray"
                                                        }
                                                        variant="filled"
                                                        size="xs"
                                                    >
                                                        {timeLeft}
                                                    </Badge>
                                                )}
                                            </Group>
                                            <Text fw={600} size="sm" lineClamp={2} style={{ height: 40 }}>
                                                {item.title}
                                            </Text>

                                            <Group justify="space-between" align="center" mt="auto">
                                                <Stack gap={0}>
                                                    <Text size="xs" c="dimmed" fw={700}>
                                                        PRICE
                                                    </Text>
                                                    <Text fw={900} size="lg" color="orange.9">
                                                        {item.currency} {item.price}
                                                    </Text>
                                                </Stack>
                                                <ActionIcon
                                                    color="blue"
                                                    variant="light"
                                                    component="a"
                                                    href={item.itemUrl}
                                                    target="_blank"
                                                    radius="xl"
                                                    size="lg"
                                                >
                                                    <IconExternalLink size={20} />
                                                </ActionIcon>
                                            </Group>
                                        </Stack>
                                    </Card>
                                );
                            })}
                        </SimpleGrid>

                        {results.length > 0 && (
                            <Center mt="xl">
                                <Button
                                    variant="subtle"
                                    color="orange"
                                    onClick={() => handleSearch(true)}
                                    loading={loadingMore}
                                    size="lg"
                                    radius="md"
                                >
                                    Load More Results
                                </Button>
                            </Center>
                        )}
                    </>
                )}

                {!loading && results.length === 0 && !error && (
                    <Center py={100}>
                        <Stack align="center" gap="xs">
                            <IconBolt size={48} color="#ddd" />
                            <Text c="dimmed">No results found for your search filters.</Text>
                        </Stack>
                    </Center>
                )}
            </Stack>
        </Container>
    );
}
