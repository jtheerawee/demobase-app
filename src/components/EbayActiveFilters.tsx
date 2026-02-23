"use client";

import {
    ActionIcon,
    Button,
    Checkbox,
    Code,
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
import { IconCode, IconPlus, IconSearch } from "@tabler/icons-react";

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
    // Build API params as objects for display
    const buildActiveParams = () => ({
        endpoint: `/api/ebay/active`,
        q: query,
        offset: 0,
        ...(service && service !== "---" ? { service } : {}),
        ...(psa && service !== "---" ? { grade: psa } : {}),
        ...(minPrice ? { minPrice } : {}),
        ...(maxPrice ? { maxPrice } : {}),
        type: listingType,
        ...(excludeJp ? { excludeJp: true } : {}),
        ...(onlyUs ? { onlyUs: true } : {}),
    });

    const buildSoldParams = () => ({
        endpoint: `/api/ebay/sold`,
        q: query,
        ...(service && service !== "---" ? { service } : {}),
        ...(psa && service !== "---" ? { grade: psa } : {}),
        ...(minPrice ? { minPrice } : {}),
        ...(maxPrice ? { maxPrice } : {}),
        ...(excludeJp ? { excludeJp: true } : {}),
        ...(onlyUs ? { onlyUs: true } : {}),
    });

    const ApiPopover = ({ label, color, params }: { label: string; color: string; params: object }) => (
        <Popover width={360} position="bottom-end" withArrow shadow="md">
            <Popover.Target>
                <Tooltip label={`${label} API params`} withArrow>
                    <ActionIcon variant="light" color={color} size="sm" radius="sm">
                        <IconCode size={14} />
                    </ActionIcon>
                </Tooltip>
            </Popover.Target>
            <Popover.Dropdown p="xs">
                <Stack gap={6}>
                    <Text size="xs" fw={800} c={color}>{label}</Text>
                    <Code block style={{ fontSize: 11, whiteSpace: "pre-wrap" }}>
                        {JSON.stringify(params, null, 2)}
                    </Code>
                </Stack>
            </Popover.Dropdown>
        </Popover>
    );

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
                <Group justify="flex-end" gap="xs">
                    <ApiPopover label="ACTIVE" color="orange" params={buildActiveParams()} />
                    <ApiPopover label="SOLD" color="blue" params={buildSoldParams()} />
                </Group>
                <SimpleGrid cols={1} spacing="md">
                    <TextInput
                        label="Search Keywords"
                        placeholder="e.g. pikachu 198"
                        value={query}
                        onChange={(e) => onQueryChange(e.currentTarget.value)}
                        leftSection={<IconSearch size={16} />}
                        styles={{ input: { borderRadius: "8px" } }}
                    />
                    <Group grow align="flex-end">
                        <Select
                            label="Service"
                            data={[
                                { label: "PSA", value: "psa" },
                                { label: "BGS", value: "bgs" },
                                { label: "CGC", value: "cgc" },
                                { label: "---", value: "---" },
                            ]}
                            value={service}
                            onChange={(value) => onServiceChange(value || "psa")}
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
                            styles={{ input: { borderRadius: "8px" } }}
                        />
                        <NumberInput
                            label="Max Price"
                            placeholder="9999"
                            value={maxPrice}
                            onChange={onMaxPriceChange}
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
                                { label: "Auction (End Soonest)", value: "auction" },
                                { label: "Fixed Price (Lowest)", value: "fixed_price" },
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
