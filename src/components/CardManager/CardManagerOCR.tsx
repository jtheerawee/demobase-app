"use client";

import { useState } from "react";
import { Group, Text, Stack, Image, Button, Loader, ActionIcon, Box } from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE, FileWithPath } from "@mantine/dropzone";
import { IconPhoto, IconUpload, IconX, IconScan, IconTrash } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { APP_CONFIG } from "@/constants/app";

interface CardManagerOCRProps {
    onResult: (text: string) => void;
    onClear?: () => void;
}

export function CardManagerOCR({ onResult, onClear }: CardManagerOCRProps) {
    const [file, setFile] = useState<FileWithPath | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleDrop = (files: FileWithPath[]) => {
        const droppedFile = files[0];
        setFile(droppedFile);
        setPreview(URL.createObjectURL(droppedFile));
    };

    const handleClear = () => {
        setFile(null);
        if (preview) URL.revokeObjectURL(preview);
        setPreview(null);
        onClear?.();
    };

    const handleScan = async () => {
        if (!file) return;

        setLoading(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

        try {
            const formData = new FormData();
            // The API expects 'fileA' as the image parameter
            formData.append("fileA", file);
            // Optional: configurations from app.ts
            formData.append("model", APP_CONFIG.OCR_MODEL);
            formData.append("score", APP_CONFIG.OCR_SCORE_THRESHOLD.toString());
            formData.append("limit", APP_CONFIG.OCR_LIMIT.toString());
            formData.append("workers", APP_CONFIG.OCR_WORKERS.toString());

            const res = await fetch(APP_CONFIG.OCR_API_URL, {
                method: "POST",
                body: formData,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!res.ok) throw new Error("OCR Service failed");

            const data = await res.json();

            // Show raw JSON response for debugging
            // notifications.show({
            //     title: "OCR Debug: Server Response",
            //     message: (
            //         <Box component="pre" style={{ margin: 0, fontSize: '10px', maxHeight: '150px', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            //             {JSON.stringify(data, null, 2)}
            //         </Box>
            //     ),
            //     color: "blue",
            //     autoClose: 8000,
            // });

            // The API returns a list of results and a bestMatch (which is results[0])
            const matches = data.results || [];
            const bestMatch = data.bestMatch || (matches.length > 0 ? matches[0] : null);

            if (bestMatch && bestMatch.path) {
                const fullPath = bestMatch.path;
                // Extract filename without extension (e.g., "[WOE]-180-Redtooth_Vanguard")
                const filename = fullPath.split("/").pop()?.split(".").shift() || "";

                if (filename) {
                    let finalQuery = filename;

                    // Simple parser for [SET]-NO-NAME format
                    // e.g. [WOE]-180-Redtooth_Vanguard -> 180 Redtooth Vanguard
                    const parts = filename.split("-");
                    if (parts.length >= 3) {
                        const cardNo = parts[1];
                        const cardName = parts.slice(2).join(" ").replace(/_/g, " ");
                        finalQuery = `${cardNo} ${cardName}`.trim();
                    }

                    onResult(finalQuery);

                    // Show a subtle notification about the match quality and total candidates
                    notifications.show({
                        title: "Card Identified",
                        message: `Best match: ${finalQuery}${matches.length > 1 ? ` (from ${matches.length} candidates)` : ''} with ${Math.round(bestMatch.score * 100)}% confidence`,
                        color: "green",
                        autoClose: 3000,
                    });
                } else {
                    throw new Error("Could not extract card identifier from result");
                }
            } else {
                throw new Error("No clear match found for this card");
            }
        } catch (err: any) {
            console.error("OCR Precise Error:", err);
            if (err.stack) console.error("OCR Stack:", err.stack);

            const isTimeout = err.name === 'AbortError';

            notifications.show({
                title: isTimeout ? "Request Timed Out" : "Scan Failed",
                message: isTimeout
                    ? "The vision server took too long to respond. Please try again."
                    : (err.message || "Failed to process image"),
                color: "red",
                icon: <IconX size={18} />,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Stack gap="md">
            {!preview ? (
                <Dropzone
                    onDrop={handleDrop}
                    onReject={(files) => console.log('rejected files', files)}
                    maxSize={5 * 1024 ** 2}
                    accept={IMAGE_MIME_TYPE}
                    multiple={false}
                    loading={loading}
                    styles={{
                        root: {
                            border: '2px dashed var(--mantine-color-gray-3)',
                            borderRadius: 'var(--mantine-radius-md)',
                            backgroundColor: 'var(--mantine-color-gray-0)',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
                            '&:hover': {
                                backgroundColor: 'var(--mantine-color-gray-1)',
                                borderColor: 'var(--mantine-color-blue-4)',
                            }
                        }
                    }}
                >
                    <Group justify="center" gap="xl" mih={140} style={{ pointerEvents: 'none' }}>
                        <Dropzone.Accept>
                            <IconUpload size={52} color="var(--mantine-color-blue-6)" stroke={1.5} />
                        </Dropzone.Accept>
                        <Dropzone.Reject>
                            <IconX size={52} color="var(--mantine-color-red-6)" stroke={1.5} />
                        </Dropzone.Reject>
                        <Dropzone.Idle>
                            <Stack align="center" gap={4}>
                                <IconPhoto size={48} color="var(--mantine-color-blue-6)" stroke={1.5} />
                                <Text size="xl" inline fw={700}>
                                    Drop Card Image
                                </Text>
                                <Text size="sm" c="dimmed" inline mt={7}>
                                    Upload a photo of your physical card
                                </Text>
                            </Stack>
                        </Dropzone.Idle>
                    </Group>
                </Dropzone>
            ) : (
                <Box pos="relative">
                    <Image
                        src={preview}
                        alt="Preview"
                        radius="md"
                        style={{ maxHeight: 300, objectFit: "contain" }}
                    />
                    <Stack gap="xs" mt="md">
                        <Group grow>
                            <Button
                                variant="filled"
                                color="blue"
                                leftSection={loading ? <Loader size="xs" /> : <IconScan size={18} />}
                                onClick={handleScan}
                                disabled={loading}
                            >
                                {loading ? "Scanning..." : "Scan Card"}
                            </Button>
                            <Button
                                variant="light"
                                color="red"
                                leftSection={<IconTrash size={18} />}
                                onClick={handleClear}
                                disabled={loading}
                            >
                                Clear
                            </Button>
                        </Group>
                    </Stack>
                </Box>
            )}
        </Stack>
    );
}
