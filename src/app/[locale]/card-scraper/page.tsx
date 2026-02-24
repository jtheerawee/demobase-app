"use client";

import { Container, SimpleGrid, Stack, Alert } from "@mantine/core";
import { PageHeader } from "@/components/PageHeader";
import { CardScraperCollectionList } from "@/components/CardScraper/CardScraperCollectionList";
import { CardScraperInputs } from "@/components/CardScraper/CardScraperInputs";
import { CardScraperRunningSteps } from "@/components/CardScraper/CardScraperRunningSteps";
import { CardScraperCardList } from "@/components/CardScraper/CardScraperCardList";
import { IconDatabaseExport, IconAlertCircle } from "@tabler/icons-react";
import { useState, useRef } from "react";
import { APP_CONFIG } from "@/constants/app";

export default function CardScraperPage() {
    const [selectedFranchise, setSelectedFranchise] = useState<string | null>("mtg");
    const [collections, setCollections] = useState<any[]>([]);
    const [steps, setSteps] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedCollectionId, setSelectedCollectionId] = useState<string | number | null>(null);

    const abortControllerRef = useRef<AbortController | null>(null);

    const handleDownload = async () => {
        if (!selectedFranchise) return;

        setLoading(true);
        setSteps([]);
        setCollections([]);
        setError(null);

        const targetUrl = selectedFranchise === "mtg" ? APP_CONFIG.MTG_URL_EN : ""; // Add others if needed

        const requestData = {
            url: targetUrl,
            type: "collections",
            franchise: selectedFranchise,
            language: "en",
            skipSave: true, // User requested: "dont save to database yet"
        };

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const response = await fetch("/api/scraper", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestData),
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error("No response body");

            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const msg = JSON.parse(line);

                        if (msg.success === false) {
                            setError(msg.error || "Scraping failed");
                            continue;
                        }

                        if (msg.type === "chunk") {
                            setCollections((prev) => [...prev, ...msg.items]);
                        } else if (msg.type === "step") {
                            setSteps((prev) => [
                                ...prev,
                                {
                                    id: Date.now() + Math.random(),
                                    message: msg.message,
                                    status: msg.message.toLowerCase().includes("finish") ? "completed" : "running",
                                    timestamp: new Date().toLocaleTimeString(),
                                },
                            ]);
                        } else if (msg.type === "complete") {
                            setSteps((prev) => [
                                ...prev,
                                {
                                    id: "complete",
                                    message: "Scraping session finished successfully.",
                                    status: "completed",
                                    timestamp: new Date().toLocaleTimeString(),
                                },
                            ]);
                        }
                    } catch (e) {
                        console.error("Failed to parse stream line:", line, e);
                    }
                }
            }
        } catch (err: any) {
            if (err.name === "AbortError") {
                setSteps((prev) => [
                    ...prev,
                    {
                        id: "abort",
                        message: "Scraping stopped by user.",
                        status: "error",
                        timestamp: new Date().toLocaleTimeString(),
                    },
                ]);
                return;
            }
            setError(err.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
        }
    };

    return (
        <Container size="xl" py="md">
            <Stack gap="lg">
                <PageHeader
                    title="Card Scraper"
                    description="Scrape and import cards from various sources"
                    icon={
                        <IconDatabaseExport
                            size={32}
                            color="var(--mantine-color-blue-6)"
                        />
                    }
                />

                {error && (
                    <Alert
                        variant="light"
                        color="red"
                        title="Scraping Error"
                        icon={<IconAlertCircle />}
                        radius="md"
                    >
                        {error}
                    </Alert>
                )}

                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                    <Stack gap="md">
                        <CardScraperInputs
                            value={selectedFranchise}
                            onChange={(val) => {
                                setSelectedFranchise(val);
                                setCollections([]);
                                setSteps([]);
                            }}
                            onDownload={handleDownload}
                            loading={loading}
                        />
                        <CardScraperRunningSteps steps={steps} />
                    </Stack>

                    <div>
                        <CardScraperCollectionList
                            collections={collections}
                            loading={loading}
                            onSelect={setSelectedCollectionId}
                        />
                    </div>

                    <div>
                        <CardScraperCardList />
                    </div>
                </SimpleGrid>
            </Stack>
        </Container>
    );
}
