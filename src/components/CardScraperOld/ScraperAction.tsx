"use client";

import { ActionIcon, Button, Group, Modal, Select, Text, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconDownload, IconTrash, IconX } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";

interface ScraperActionProps {
    franchise: string;
    language: string;
    loading: boolean;
    onRefresh: () => void;
    onDelete?: () => void;
    onStop?: () => void;
}

export function ScraperAction({
    franchise,
    language,
    loading,
    onRefresh,
    onDelete,
    onStop,
}: ScraperActionProps) {
    const [indices, setIndices] = useState<number[]>([]);
    const [maxIndex, setMaxIndex] = useState<number | null>(null);
    const [fetchingIndex, setFetchingIndex] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState<string | null>(null);

    const fetchIndices = useCallback(async () => {
        setFetchingIndex(true);
        try {
            const response = await fetch(`/api/scraper/scraped-index?franchise=${franchise}&language=${language}`);
            const data = await response.json();
            if (data.success) {
                setIndices(data.indices || []);
                setMaxIndex(data.maxIndex);
                if (data.indices && data.indices.length > 0) {
                    setSelectedIndex(data.indices[0].toString());
                } else {
                    setSelectedIndex(null);
                }
            }
        } catch (error) {
            console.error("Failed to fetch indices:", error);
        } finally {
            setFetchingIndex(false);
        }
    }, [franchise, language]);

    const [opened, { open, close }] = useDisclosure(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (franchise && language) {
            fetchIndices();
        }
    }, [franchise, language, fetchIndices]);

    const handleDelete = async () => {
        if (!selectedIndex) return;

        setDeleting(true);
        try {
            const res = await fetch(
                `/api/scraper/reset?franchise=${franchise}&language=${language}&index=${selectedIndex}`,
                {
                    method: "DELETE",
                }
            );
            const data = await res.json();
            if (data.success) {
                notifications.show({
                    title: "Success",
                    message: `Scraped data for index ${selectedIndex} has been deleted.`,
                    color: "green",
                });
                onDelete?.();
                fetchIndices();
                close();
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            notifications.show({
                title: "Error",
                message: error.message || "Failed to delete data",
                color: "red",
            });
        } finally {
            setDeleting(false);
        }
    };

    const hasData = indices.length > 0;

    return (
        <>
            <Modal opened={opened} onClose={close} title="Confirm Deletion" centered>
                <Text size="sm" mb="lg">
                    Are you sure you want to delete scraped collections and cards for{" "}
                    <b>
                        {franchise} ({language})
                    </b>{" "}
                    at Index <b>{selectedIndex}</b>? This action cannot be undone.
                </Text>
                <Group justify="flex-end">
                    <Button variant="default" onClick={close}>
                        Cancel
                    </Button>
                    <Button color="red" loading={deleting} onClick={handleDelete}>
                        Delete Index {selectedIndex}
                    </Button>
                </Group>
            </Modal>

            <Group justify="space-between" wrap="nowrap">
                <Group gap="xs" align="center">
                    <Text size="xs" fw={700} c="dimmed">
                        INDEX
                    </Text>
                    <Select
                        data={indices.map(String)}
                        value={selectedIndex}
                        onChange={setSelectedIndex}
                        placeholder={hasData ? "Select" : "No Data"}
                        disabled={!hasData || fetchingIndex}
                        allowDeselect={false}
                        size="xs"
                        w={80}
                        styles={{ input: { fontWeight: 700 } }}
                    />
                </Group>

                <Group gap={8}>
                    <Tooltip label="Delete Scraped Data" position="left" withArrow>
                        <ActionIcon
                            variant="light"
                            color="red"
                            size="lg"
                            onClick={open}
                            loading={loading}
                            disabled={!hasData}
                        >
                            <IconTrash size={20} />
                        </ActionIcon>
                    </Tooltip>

                    {loading ? (
                        <Tooltip label="Stop Scraping" position="left" withArrow>
                            <ActionIcon variant="light" color="red" size="lg" onClick={onStop}>
                                <IconX size={20} />
                            </ActionIcon>
                        </Tooltip>
                    ) : (
                        <Tooltip
                            label={`Scrape New (Index ${maxIndex !== null ? maxIndex + 1 : 1})`}
                            position="left"
                            withArrow
                        >
                            <ActionIcon variant="light" color="blue" size="lg" onClick={onRefresh}>
                                <IconDownload size={20} />
                            </ActionIcon>
                        </Tooltip>
                    )}
                </Group>
            </Group>
        </>
    );
}
