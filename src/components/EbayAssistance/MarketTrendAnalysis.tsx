"use client";

import {
    Badge,
    Card,
    Center,
    Grid,
    Group,
    Paper,
    SimpleGrid,
    Stack,
    Text,
    Title,
} from "@mantine/core";
import { IconTrendingUp } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import {
    CartesianGrid,
    Line,
    LineChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import type { EbayItem } from "@/services/ebayService";
import { MarketTrendAnalysisHeader } from "./MarketTrendAnalysisHeader";

function calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
}

function filterByDays(
    items: EbayItem[],
    days: number,
): EbayItem[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return items.filter((item) => {
        const dateStr =
            item.endDate ||
            (item as any).soldTime ||
            (item as any).soldDate ||
            (item as any).timestamp;
        if (!dateStr) return false;
        const date = new Date(dateStr);
        return (
            !Number.isNaN(date.getTime()) && date >= cutoff
        );
    });
}

interface CustomDotProps {
    cx?: number;
    cy?: number;
    payload: {
        price: number;
        date: string;
        fullDate: string;
    };
    minPrice: number;
    maxPrice: number;
    highlightedDate?: string | null;
}

const CustomDot = (props: CustomDotProps) => {
    const {
        cx,
        cy,
        payload,
        minPrice,
        maxPrice,
        highlightedDate,
    } = props;
    if (cx === undefined || cy === undefined) return null;

    if (
        highlightedDate &&
        payload.fullDate === highlightedDate
    ) {
        return (
            <circle
                cx={cx}
                cy={cy}
                r={8}
                fill="#ffcc00"
                stroke="#fff"
                strokeWidth={3}
                style={{ transition: "all 0.2s ease" }}
            />
        );
    }

    if (payload.price === maxPrice) {
        return (
            <circle
                cx={cx}
                cy={cy}
                r={6}
                fill="#fa5252"
                stroke="#fff"
                strokeWidth={2}
            />
        );
    }
    if (payload.price === minPrice) {
        return (
            <circle
                cx={cx}
                cy={cy}
                r={6}
                fill="#40c057"
                stroke="#fff"
                strokeWidth={2}
            />
        );
    }
    return (
        <circle
            cx={cx}
            cy={cy}
            r={4}
            fill="#228be6"
            stroke="#fff"
            strokeWidth={2}
        />
    );
};

interface MarketTrendAnalysisProps {
    results: EbayItem[];
    exchangeRate?: number | null;
    highlightedDate?: string | null;
    query?: string;
    service?: string;
    grade?: string;
    minPrice?: number | string;
    maxPrice?: number | string;
    excludeJp?: boolean;
    onlyUs?: boolean;
    listingType?: string;
}

export function MarketTrendAnalysis({
    results,
    exchangeRate,
    highlightedDate,
    query,
    service,
    grade,
    minPrice,
    maxPrice,
    excludeJp,
    onlyUs,
    listingType,
}: MarketTrendAnalysisProps) {
    const t = useTranslations("EbayAssistance.analysis");
    // Defensive: ensure results is always an array
    const safeResults = Array.isArray(results)
        ? results
        : [];

    const currencySymbol = useMemo(() => {
        if (safeResults.length === 0) return "$";
        const firstWithCurrency = safeResults.find(
            (item) => item.currency,
        );
        if (!firstWithCurrency) return "$";
        return firstWithCurrency.currency === "USD"
            ? "$"
            : firstWithCurrency.currency;
    }, [safeResults]);

    const stats = useMemo(() => {
        const defaultStats = {
            min: 0,
            max: 0,
            avg: 0,
            median: 0,
            median14: 0,
            median30: 0,
            avg14: 0,
            avg30: 0,
            count: 0,
        };
        if (safeResults.length === 0) return defaultStats;

        const prices = safeResults
            .map((item) => {
                const p = String(item.price || "0").replace(
                    /[^0-9.]/g,
                    "",
                );
                return parseFloat(p);
            })
            .filter((price) => !Number.isNaN(price));

        if (prices.length === 0) return defaultStats;

        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const avg =
            prices.reduce((a, b) => a + b, 0) /
            prices.length;
        const median = calculateMedian(prices);

        const items14 = filterByDays(safeResults, 14);
        const prices14 = items14
            .map((item) => {
                const p = String(item.price || "0").replace(
                    /[^0-9.]/g,
                    "",
                );
                return parseFloat(p);
            })
            .filter((p) => !Number.isNaN(p));
        const median14 = calculateMedian(prices14);
        const avg14 =
            prices14.length > 0
                ? prices14.reduce((a, b) => a + b, 0) /
                  prices14.length
                : 0;

        const items30 = filterByDays(safeResults, 30);
        const prices30 = items30
            .map((item) => {
                const p = String(item.price || "0").replace(
                    /[^0-9.]/g,
                    "",
                );
                return parseFloat(p);
            })
            .filter((p) => !Number.isNaN(p));
        const median30 = calculateMedian(prices30);
        const avg30 =
            prices30.length > 0
                ? prices30.reduce((a, b) => a + b, 0) /
                  prices30.length
                : 0;

        return {
            min,
            max,
            avg,
            median,
            median14,
            median30,
            avg14,
            avg30,
            count: prices.length,
        };
    }, [safeResults]);

    const chartData = useMemo(() => {
        if (safeResults.length === 0) return [];

        const groupedByDate: Record<string, number[]> = {};

        safeResults.forEach((item) => {
            const dateStr =
                item.endDate ||
                (item as any).soldTime ||
                (item as any).soldDate ||
                (item as any).timestamp;
            if (!dateStr) return;
            const date = new Date(dateStr);
            if (Number.isNaN(date.getTime())) return;

            const dateKey = date
                .toISOString()
                .split("T")[0];
            if (!groupedByDate[dateKey])
                groupedByDate[dateKey] = [];
            const pRaw = String(item.price || "0").replace(
                /[^0-9.]/g,
                "",
            );
            const price = parseFloat(pRaw);
            if (!Number.isNaN(price)) {
                groupedByDate[dateKey].push(price);
            }
        });

        const sortedKeys =
            Object.keys(groupedByDate).sort();

        return sortedKeys.map((dateKey) => {
            const prices = groupedByDate[dateKey];
            const maxPrice =
                prices.length > 0 ? Math.max(...prices) : 0;
            return {
                date: new Date(dateKey).toLocaleDateString(
                    undefined,
                    {
                        month: "short",
                        day: "numeric",
                    },
                ),
                price: parseFloat(maxPrice.toFixed(2)),
                fullDate: dateKey,
                count: prices.length,
            };
        });
    }, [safeResults]);

    const chartMaxPrice = useMemo(() => {
        if (chartData.length === 0) return 0;
        return Math.max(...chartData.map((d) => d.price));
    }, [chartData]);

    const chartMinPrice = useMemo(() => {
        if (chartData.length === 0) return 0;
        return Math.min(...chartData.map((d) => d.price));
    }, [chartData]);

    return (
        <Stack gap="md" mb="xl">
            <Group
                gap="xs"
                justify="space-between"
                align="center"
            >
                <MarketTrendAnalysisHeader
                    query={query}
                    service={service}
                    grade={grade}
                    minPrice={minPrice}
                    maxPrice={maxPrice}
                    excludeJp={excludeJp}
                    onlyUs={onlyUs}
                    listingType={listingType}
                />
                {exchangeRate && (
                    <Badge
                        variant="light"
                        color="gray"
                        size="sm"
                    >
                        1 USD ={" "}
                        {(1 / exchangeRate).toFixed(2)} THB
                    </Badge>
                )}
            </Group>

            <Grid gutter="md">
                <Grid.Col span={{ base: 12, sm: 3 }}>
                    <Card
                        withBorder
                        padding="sm"
                        radius="md"
                    >
                        <Stack gap={0}>
                            <Text
                                size="xs"
                                fw={700}
                                c="dimmed"
                            >
                                {t("average")}
                            </Text>
                            <Text
                                size="xl"
                                fw={900}
                                color="blue.7"
                            >
                                {currencySymbol}
                                {stats.avg.toLocaleString(
                                    undefined,
                                    {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 0,
                                    },
                                )}
                            </Text>
                            <SimpleGrid cols={2} mt="xs">
                                <Stack gap={0}>
                                    <Text
                                        size="xs"
                                        c="dimmed"
                                    >
                                        30d
                                    </Text>
                                    <Text
                                        size="sm"
                                        fw={700}
                                        color="blue.6"
                                    >
                                        {currencySymbol}
                                        {stats.avg30.toLocaleString(
                                            undefined,
                                            {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 0,
                                            },
                                        )}
                                    </Text>
                                </Stack>
                                <Stack gap={0}>
                                    <Text
                                        size="xs"
                                        c="dimmed"
                                    >
                                        14d
                                    </Text>
                                    <Text
                                        size="sm"
                                        fw={700}
                                        color="blue.6"
                                    >
                                        {currencySymbol}
                                        {stats.avg14.toLocaleString(
                                            undefined,
                                            {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 0,
                                            },
                                        )}
                                    </Text>
                                </Stack>
                            </SimpleGrid>
                        </Stack>
                    </Card>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 3 }}>
                    <Card
                        withBorder
                        padding="sm"
                        radius="md"
                    >
                        <Stack gap={0}>
                            <Text
                                size="xs"
                                fw={700}
                                c="dimmed"
                            >
                                {t("median")}
                            </Text>
                            <Text
                                size="xl"
                                fw={900}
                                color="teal.7"
                            >
                                {currencySymbol}
                                {stats.median.toLocaleString(
                                    undefined,
                                    {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 0,
                                    },
                                )}
                            </Text>
                            <SimpleGrid cols={2} mt="xs">
                                <Stack gap={0}>
                                    <Text
                                        size="xs"
                                        c="dimmed"
                                    >
                                        30d
                                    </Text>
                                    <Text
                                        size="sm"
                                        fw={700}
                                        color="teal.6"
                                    >
                                        {currencySymbol}
                                        {stats.median30.toLocaleString(
                                            undefined,
                                            {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 0,
                                            },
                                        )}
                                    </Text>
                                </Stack>
                                <Stack gap={0}>
                                    <Text
                                        size="xs"
                                        c="dimmed"
                                    >
                                        14d
                                    </Text>
                                    <Text
                                        size="sm"
                                        fw={700}
                                        color="teal.6"
                                    >
                                        {currencySymbol}
                                        {stats.median14.toLocaleString(
                                            undefined,
                                            {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 0,
                                            },
                                        )}
                                    </Text>
                                </Stack>
                            </SimpleGrid>
                        </Stack>
                    </Card>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 3 }}>
                    <Card
                        withBorder
                        padding="sm"
                        radius="md"
                    >
                        <Stack gap={0}>
                            <Text
                                size="xs"
                                fw={700}
                                c="dimmed"
                            >
                                {t("lowest")}
                            </Text>
                            <Text
                                size="xl"
                                fw={900}
                                color="green.7"
                            >
                                {currencySymbol}
                                {stats.min.toLocaleString(
                                    undefined,
                                    {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    },
                                )}
                            </Text>
                        </Stack>
                    </Card>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 3 }}>
                    <Card
                        withBorder
                        padding="sm"
                        radius="md"
                    >
                        <Stack gap={0}>
                            <Text
                                size="xs"
                                fw={700}
                                c="dimmed"
                            >
                                {t("highest")}
                            </Text>
                            <Text
                                size="xl"
                                fw={900}
                                color="red.7"
                            >
                                {currencySymbol}
                                {stats.max.toLocaleString(
                                    undefined,
                                    {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    },
                                )}
                            </Text>
                        </Stack>
                    </Card>
                </Grid.Col>
            </Grid>

            <Paper
                withBorder
                p="md"
                radius="md"
                bg="gray.0"
            >
                <Stack gap="xs">
                    <Text size="xs" fw={700} c="dimmed">
                        {t("trend", { count: stats.count })}
                    </Text>
                    <div
                        style={{
                            height: 200,
                            width: "100%",
                        }}
                    >
                        {chartData.length > 0 ? (
                            <ResponsiveContainer
                                width="100%"
                                height="100%"
                            >
                                <LineChart
                                    data={chartData}
                                    margin={{
                                        top: 5,
                                        right: 20,
                                        left: 10,
                                        bottom: 5,
                                    }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                        stroke="#e9ecef"
                                    />
                                    <XAxis
                                        dataKey="fullDate"
                                        tick={{
                                            fontSize: 12,
                                            fill: "#868e96",
                                        }}
                                        tickLine={false}
                                        axisLine={{
                                            stroke: "#dee2e6",
                                        }}
                                        tickFormatter={(
                                            val,
                                        ) => {
                                            const d =
                                                new Date(
                                                    val,
                                                );
                                            return d.toLocaleDateString(
                                                undefined,
                                                {
                                                    month: "short",
                                                    day: "numeric",
                                                },
                                            );
                                        }}
                                    />
                                    <YAxis
                                        tick={{
                                            fontSize: 12,
                                            fill: "#868e96",
                                        }}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(
                                            value,
                                        ) =>
                                            `${currencySymbol}${value}`
                                        }
                                        domain={[
                                            "auto",
                                            "auto",
                                        ]}
                                    />
                                    <Tooltip
                                        cursor={{
                                            stroke: "#adb5bd",
                                            strokeWidth: 1,
                                            strokeDasharray:
                                                "4 4",
                                        }}
                                        content={({
                                            active,
                                            payload,
                                            label,
                                        }) => {
                                            if (
                                                active &&
                                                payload &&
                                                payload.length
                                            ) {
                                                return (
                                                    <Paper
                                                        withBorder
                                                        p="xs"
                                                        radius="sm"
                                                        bg="gray.1"
                                                        shadow="xs"
                                                    >
                                                        <Stack
                                                            gap={
                                                                2
                                                            }
                                                        >
                                                            <Text
                                                                size="xs"
                                                                c="dimmed"
                                                                fw={
                                                                    700
                                                                }
                                                            >
                                                                {
                                                                    label
                                                                }
                                                            </Text>
                                                            <Group
                                                                gap={
                                                                    4
                                                                }
                                                                align="baseline"
                                                            >
                                                                <Text
                                                                    size="xs"
                                                                    fw={
                                                                        700
                                                                    }
                                                                    c="dimmed"
                                                                >
                                                                    Max:
                                                                </Text>
                                                                <Text
                                                                    size="sm"
                                                                    fw={
                                                                        800
                                                                    }
                                                                    c="blue.7"
                                                                >
                                                                    {
                                                                        currencySymbol
                                                                    }
                                                                    {payload[0].value?.toLocaleString()}
                                                                </Text>
                                                                <Text
                                                                    size="10px"
                                                                    c="dimmed"
                                                                >
                                                                    (
                                                                    {
                                                                        payload[0]
                                                                            .payload
                                                                            .count
                                                                    }{" "}
                                                                    listings)
                                                                </Text>
                                                            </Group>
                                                        </Stack>
                                                    </Paper>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    {highlightedDate && (
                                        <ReferenceLine
                                            x={
                                                highlightedDate
                                            }
                                            stroke="#fa5252"
                                            strokeDasharray="3 3"
                                        />
                                    )}
                                    <Line
                                        type="monotone"
                                        dataKey="price"
                                        stroke="#228be6"
                                        strokeWidth={3}
                                        activeDot={{
                                            r: 8,
                                            strokeWidth: 0,
                                        }}
                                        dot={(
                                            props: any,
                                        ) => (
                                            <CustomDot
                                                {...props}
                                                minPrice={
                                                    chartMinPrice
                                                }
                                                maxPrice={
                                                    chartMaxPrice
                                                }
                                                highlightedDate={
                                                    highlightedDate
                                                }
                                            />
                                        )}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <Center h="100%">
                                <Stack
                                    align="center"
                                    gap={4}
                                >
                                    <Text
                                        size="sm"
                                        c="dimmed"
                                        fw={500}
                                    >
                                        {t("noData")}
                                    </Text>
                                    <Text
                                        size="xs"
                                        c="dimmed"
                                    >
                                        {t(
                                            "buildingHistory",
                                        )}
                                    </Text>
                                </Stack>
                            </Center>
                        )}
                    </div>
                </Stack>
            </Paper>
        </Stack>
    );
}
