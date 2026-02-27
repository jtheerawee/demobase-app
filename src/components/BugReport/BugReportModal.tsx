
"use client";

import {
    Modal,
    TextInput,
    Textarea,
    Button,
    Group,
    Stack,
    Image,
    Text,
    LoadingOverlay,
    Box,
} from "@mantine/core";
import { useState, useEffect } from "react";
import { notifications } from "@mantine/notifications";
import { IconBug, IconCheck } from "@tabler/icons-react";
import { createClient } from "@/utils/supabase/client";

interface BugReportModalProps {
    opened: boolean;
    onClose: () => void;
    screenshot: string | null;
}

export function BugReportModal({ opened, onClose, screenshot }: BugReportModalProps) {
    const [description, setDescription] = useState("");
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) {
                setEmail(user.email);
            }
        };

        if (opened) {
            fetchUser();
        }
    }, [opened]);

    const handleSubmit = async () => {
        setIsSubmitting(true);

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500));

        console.log("Bug Report Submitted:", {
            description,
            email,
            screenshot,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
        });

        notifications.show({
            title: "Report Submitted",
            message: "Thank you for your feedback! We will look into it.",
            color: "green",
            icon: <IconCheck size={18} />,
        });

        setIsSubmitting(false);
        onClose();
        setDescription("");
        setEmail("");
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group gap="xs">
                    <IconBug size={20} color="var(--mantine-color-red-6)" />
                    <Text fw={700}>Report a Bug</Text>
                </Group>
            }
            size="lg"
        >
            <Box pos="relative">
                <LoadingOverlay visible={isSubmitting} overlayProps={{ blur: 2 }} />

                <Stack gap="md">
                    <Text size="sm" c="dimmed">
                        Tell us what went wrong. A screenshot of the current page has been captured to help us debug.
                    </Text>

                    <TextInput
                        label="Email (Optional)"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.currentTarget.value)}
                    />

                    <Textarea
                        label="Description"
                        placeholder="Describe the issue you encountered..."
                        required
                        minRows={4}
                        value={description}
                        onChange={(e) => setDescription(e.currentTarget.value)}
                    />

                    {screenshot && (
                        <Box>
                            <Text size="sm" fw={500} mb={4}>Captured Screenshot:</Text>
                            <Box
                                style={{
                                    border: "1px solid var(--mantine-color-gray-3)",
                                    borderRadius: "var(--mantine-radius-sm)",
                                    overflow: "hidden"
                                }}
                            >
                                <Image src={screenshot} alt="Bug screenshot" />
                            </Box>
                        </Box>
                    )}

                    <Group justify="flex-end">
                        <Button variant="subtle" color="gray" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            leftSection={<IconBug size={18} />}
                            color="red"
                            onClick={handleSubmit}
                            disabled={!description}
                        >
                            Submit Report
                        </Button>
                    </Group>
                </Stack>
            </Box>
        </Modal>
    );
}
