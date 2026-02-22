"use client";

import { createClient } from "@/utils/supabase/client";
import {
  Anchor,
  Badge,
  Box,
  Button,
  Checkbox,
  Grid,
  Group,
  Image,
  Loader,
  Pagination,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useState } from "react";
import { ApiDebugPanel } from "@/components/ApiDebugPanel";

interface SoldItem {
  itemId: string | null;
  title: string;
  price: string;
  priceValue: number | null;
  currency: string;
  soldDate: string | null;
  listingType: "Auction" | "BuyItNow" | "Unknown";
  bids: number | null;
  imageUrl: string | null;
  itemUrl: string;
}

interface SoldResult {
  keyword: string;
  page: number;
  filters: { grade: number | null; excludeJp: boolean; onlyUs: boolean };
  items: SoldItem[];
}

const GRADE_OPTIONS = [
  ...Array.from({ length: 10 }, (_, i) => ({
    value: String(10 - i),
    label: `PSA ${10 - i}`,
  })),
  { value: "0", label: "Ungraded" },
];

export default function SoldItemsPage() {
  const [keyword, setKeyword] = useState("198 PIKACHU");
  const [grade, setGrade] = useState<string | null>(null);
  const [excludeJp, setExcludeJp] = useState(false);
  const [onlyUs, setOnlyUs] = useState(false);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<SoldResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function search(targetPage = 1) {
    const kw = keyword.trim();
    if (!kw) return;

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const params = new URLSearchParams({ page: String(targetPage) });
      if (grade !== null && grade !== "") params.set("grade", grade);
      if (excludeJp) params.set("exclude_jp", "true");
      if (onlyUs) params.set("only_us", "true");

      const res = await fetch(
        `/api/ebay/sold/${encodeURIComponent(kw)}?${params}`,
        { headers: { Authorization: `Bearer ${session?.access_token ?? ""}` } },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }

      setResult(await res.json());
      setPage(targetPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function handlePageChange(p: number) {
    search(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const rows = result?.items.map((item) => (
    <Table.Tr key={item.itemUrl}>
      <Table.Td>
        <Image
          src={item.imageUrl ?? undefined}
          alt={item.title}
          w={48}
          h={48}
          fit="contain"
          radius="sm"
          fallbackSrc="https://placehold.co/48x48?text=?"
        />
      </Table.Td>
      <Table.Td>
        <Anchor href={item.itemUrl} target="_blank" size="sm" lineClamp={2}>
          {item.title}
        </Anchor>
      </Table.Td>
      <Table.Td>
        <Text fw={600} size="sm" style={{ whiteSpace: "nowrap" }}>
          {item.price}
        </Text>
      </Table.Td>
      <Table.Td>
        <Badge
          size="sm"
          variant="light"
          color={item.listingType === "Auction" ? "blue" : "green"}
        >
          {item.listingType}
        </Badge>
        {item.bids != null && (
          <Text size="xs" c="dimmed">
            {item.bids} bids
          </Text>
        )}
      </Table.Td>
      <Table.Td>
        <Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>
          {item.soldDate ?? "—"}
        </Text>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Box p="xl">
      <Stack gap="xl">
        <Title order={1}>Sold Items</Title>

        <Grid gutter="xl" align="flex-start">
          {/* Filters — 1/3 */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="md">
              <Box
                p="md"
                style={{
                  border: "1px solid var(--mantine-color-gray-3)",
                  borderRadius: "var(--mantine-radius-md)",
                  background: process.env.NEXT_PUBLIC_INPUT_BOX_COLOR ?? "var(--mantine-color-gray-1)",
                }}
              >
                <Stack gap="md">
                  <TextInput
                    label="Keyword"
                    placeholder="charizard 050"
                    value={keyword}
                    onChange={(e) => setKeyword(e.currentTarget.value)}
                    onKeyDown={(e) => e.key === "Enter" && search(1)}
                  />
                  <Select
                    label="Grade"
                    placeholder="Any grade"
                    data={GRADE_OPTIONS}
                    value={grade}
                    onChange={setGrade}
                    clearable
                  />
                  <Checkbox
                    label="Exclude Japanese"
                    checked={excludeJp}
                    onChange={(e) => setExcludeJp(e.currentTarget.checked)}
                  />
                  <Checkbox
                    label="US only"
                    checked={onlyUs}
                    onChange={(e) => setOnlyUs(e.currentTarget.checked)}
                  />
                  <Button onClick={() => search(1)} loading={loading} fullWidth>
                    Search
                  </Button>
                </Stack>
              </Box>

              {result && !loading && process.env.NEXT_PUBLIC_DEVELOPER_MODE === "true" && (
                <ApiDebugPanel data={result} label={`GET /api/ebay/sold/${result.keyword}`} />
              )}
            </Stack>
          </Grid.Col>

          {/* Results — 2/3 */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            {error && (
              <Text c="red" size="sm">
                {error}
              </Text>
            )}

            {loading && (
              <Group justify="center" py="xl">
                <Loader />
              </Group>
            )}

            {result && !loading && (
              <Stack gap="md">
                <Text size="sm" c="dimmed">
                  {result.items.length === 0
                    ? "No results found."
                    : `Page ${result.page} · ${result.items.length} items`}
                </Text>

                {result.items.length > 0 && (
                  <>
                    <Table
                      striped
                      highlightOnHover
                      withTableBorder
                      withColumnBorders
                    >
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th w={64}>Image</Table.Th>
                          <Table.Th>Title</Table.Th>
                          <Table.Th>Price</Table.Th>
                          <Table.Th>Type</Table.Th>
                          <Table.Th>Sold</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>{rows}</Table.Tbody>
                    </Table>

                    <Group justify="center">
                      <Pagination
                        value={page}
                        onChange={handlePageChange}
                        total={page + (result.items.length > 0 ? 1 : 0)}
                      />
                    </Group>
                  </>
                )}
              </Stack>
            )}
          </Grid.Col>
        </Grid>
      </Stack>
    </Box>
  );
}
