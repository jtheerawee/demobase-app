"use client";

import {
    ActionIcon,
    Button,
    Checkbox,
    Code,
    Divider,
    Group,
    NumberInput,
    Paper,
    Popover,
    SegmentedControl,
    Select,
    SimpleGrid,
    Stack,
    Text,
    TextInput,
    Tooltip,
} from "@mantine/core";
import { IconCode, IconCoin, IconPlus, IconSearch } from "@tabler/icons-react";

interface EbayActiveFiltersProps {
    query: string;
    onQueryChange: (value: string) => void;
    service: string;
    onServiceChange: (value: string) => void;
    psa: string;
    onPsaChange: (value: string) => void;
    minPrice: number | string;
    onMinPriceChange: (value: number | string) => void;
    maxPrice: number | string;
    onMaxPriceChange: (value: number | string) => void;
    listingType: string;
    onListingTypeChange: (value: string) => void;
    excludeJp: boolean;
    onExcludeJpChange: (value: boolean) => void;
    onlyUs: boolean;
    onOnlyUsChange: (value: boolean) => void;
    onSearch: (isLoadMore: boolean) => void;
    onSaveSearch: () => void;
    loading: boolean;
    saving: boolean;
}

export function EbayActiveFilters({
    query,
    onQueryChange,
    service,
    onServiceChange,
    psa,
    onPsaChange,
    minPrice,
    onMinPriceChange,
    maxPrice,
    onMaxPriceChange,
    listingType,
    onListingTypeChange,
    excludeJp,
    onExcludeJpChange,
    onlyUs,
    onOnlyUsChange,
    onSearch,
    onSaveSearch,
    loading,
    saving,
}: EbayActiveFiltersProps) {
    // Build API URLs for display
    const buildActiveUrl = () => {
        let url = `/api/ebay/active?q=${encodeURIComponent(query)}&offset=0`;
        if (service && service !== "---") url += `&service=${service}`;
        if (psa && service !== "---") url += `&grade=${psa}`;
        if (minPrice) url += `&minPrice=${minPrice}`;
        if (maxPrice) url += `&maxPrice=${maxPrice}`;
        if (listingType !== "ALL") url += `&type=${listingType}`;
        if (excludeJp) url += `&excludeJp=true`;
        if (onlyUs) url += `&onlyUs=true`;
        return url;
    };

    const buildSoldUrl = () => {
        let url = `/api/ebay/sold?q=${encodeURIComponent(query)}`;
        if (service && service !== "---") url += `&service=${service}`;
        if (psa && service !== "---") url += `&grade=${psa}`;
        if (minPrice) url += `&minPrice=${minPrice}`;
        if (maxPrice) url += `&maxPrice=${maxPrice}`;
        if (excludeJp) url += `&excludeJp=true`;
        if (onlyUs) url += `&onlyUs=true`;
        return url;
    };

    return (
        <Paper
            p="xl"
            radius="md"
            withBorder
            shadow="sm"
            bg="rgba(255, 255, 255, 0.8)"
            style={{ backdropFilter: "blur(10px)" }}
        >
            <Stack gap="md">
                <Group justify="flex-end">
                    <Popover width={380} position="bottom-end" withArrow shadow="md">
                        <Popover.Target>
                            <Tooltip label="View API calls" withArrow>
                                <ActionIcon variant="subtle" color="gray" size="sm">
                                    <IconCode size={16} />
                                </ActionIcon>
                            </Tooltip>
                        </Popover.Target>
                        <Popover.Dropdown>
                            <Stack gap="xs">
                                <Text size="xs" fw={700} c="dimmed">ACTIVE</Text>
                                <Code block style={{ wordBreak: "break-all", fontSize: 11 }}>
                                    {buildActiveUrl()}
                                </Code>
                                <Divider />
                                <Text size="xs" fw={700} c="dimmed">SOLD</Text>
                                <Code block style={{ wordBreak: "break-all", fontSize: 11 }}>
                                    {buildSoldUrl()}
                                </Code>
                            </Stack>
                        </Popover.Dropdown>
                    </Popover>
                </Group>
                <SimpleGrid cols={1} spacing="md">
                    <TextInput
                        label="Search Keywords"
                        placeholder="e.g. Charizard 050"
                        value={query}
                        onChange={(e) => onQueryChange(e.currentTarget.value)}
                        leftSection={<IconSearch size={16} />}
                        styles={{ input: { borderRadius: "8px" } }}
                    />
                    <Group grow align="flex-end">
                        <Select
                            label="Service"
                            data={["PSA", "BGS", "CGC", "---"]}
                            value={service}
                            onChange={(value) => onServiceChange(value || "PSA")}
                            styles={{ input: { borderRadius: "8px" } }}
                        />
                        <Select
                            label="Grade"
                            disabled={service === "---"}
                            data={["10", "9", "8", "7", "6", "5", "4", "3", "2", "1"]}
                            value={psa}
                            onChange={(value) => onPsaChange(value || "")}
                            styles={{ input: { borderRadius: "8px" } }}
                        />
                    </Group>
                    <Group grow align="flex-end">
                        <NumberInput
                            label="Min Price"
                            placeholder="0"
                            value={minPrice}
                            onChange={onMinPriceChange}
                            leftSection={<IconCoin size={16} />}
                            styles={{ input: { borderRadius: "8px" } }}
                        />
                        <NumberInput
                            label="Max Price"
                            placeholder="9999"
                            value={maxPrice}
                            onChange={onMaxPriceChange}
                            leftSection={<IconCoin size={16} />}
                            styles={{ input: { borderRadius: "8px" } }}
                        />
                    </Group>
                    <Group gap="xl">
                        <Checkbox
                            label="Exclude Japanese"
                            checked={excludeJp}
                            onChange={(e) => onExcludeJpChange(e.currentTarget.checked)}
                            color="orange"
                        />
                        <Checkbox
                            label="US Only"
                            checked={onlyUs}
                            onChange={(e) => onOnlyUsChange(e.currentTarget.checked)}
                            color="orange"
                        />
                    </Group>
                </SimpleGrid>

                <Stack gap="md">
                    <Stack gap={4}>
                        <Text size="sm" fw={500}>
                            Listing Type &amp; Sort
                        </Text>
                        <SegmentedControl
                            fullWidth
                            value={listingType}
                            onChange={onListingTypeChange}
                            data={[
                                { label: "Auction (End Soonest)", value: "AUCTION" },
                                { label: "Fixed Price (Lowest)", value: "FIXED_PRICE" },
                            ]}
                            color="orange"
                            styles={{ root: { borderRadius: "8px" } }}
                        />
                    </Stack>
                    <Group grow>
                        <Button
                            variant="light"
                            color="orange"
                            leftSection={<IconPlus size={18} />}
                            onClick={onSaveSearch}
                            loading={saving}
                            radius="md"
                            size="md"
                        >
                            Save Search
                        </Button>
                        <Button
                            color="orange"
                            onClick={() => onSearch(false)}
                            loading={loading}
                            size="md"
                            style={{ borderRadius: "8px" }}
                            leftSection={<IconSearch size={18} />}
                        >
                            Search Now
                        </Button>
                    </Group>
                </Stack>
            </Stack>
        </Paper>
    );
}
