"use client";

import { useState } from "react";
import { Group, Text, Stack, Image, Button, Loader, ActionIcon, Box } from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE, FileWithPath } from "@mantine/dropzone";
import { IconPhoto, IconUpload, IconX, IconScan, IconTrash } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { APP_CONFIG } from "@/constants/app";

interface CardManagerOCRProps {
    onResult: (text: string) => void;
}

export function CardManagerOCR({ onResult }: CardManagerOCRProps) {
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
    };

    const handleScan = async () => {
        if (!file) return;

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch(APP_CONFIG.OCR_API_URL, {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("OCR Service failed");

            const data = await res.json();
            // Assuming the API returns something like { result: "Card Name or Text" }
            const text = data.result || data.text || "";

            if (text) {
                onResult(text);
                notifications.show({
                    title: "Scan Successful",
                    message: `Identified: ${text}`,
                    color: "green",
                });
            } else {
                throw new Error("Could not read card text");
            }
        } catch (err: any) {
            console.error("OCR Error:", err);
            notifications.show({
                title: "Scan Failed",
                message: err.message || "Failed to process image",
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
