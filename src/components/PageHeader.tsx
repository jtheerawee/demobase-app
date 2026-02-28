"use client";

import { ActionIcon, Group, Stack, Text, Title } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

interface PageHeaderProps {
    title: string;
    description?: string;
    icon?: ReactNode;
    backHref?: string;
    actions?: ReactNode;
}

export function PageHeader({ title, description, icon, backHref = "/", actions }: PageHeaderProps) {
    return (
        <Group justify="space-between" align="flex-start">
            <Group align="center" gap="sm">
                <ActionIcon component={Link} href={backHref} variant="subtle" color="gray" size="lg" radius="md">
                    <IconArrowLeft size={24} />
                </ActionIcon>

                {icon}

                <Stack gap={0}>
                    <Title order={2}>{title}</Title>
                    {description && (
                        <Text c="dimmed" size="sm">
                            {description}
                        </Text>
                    )}
                </Stack>
            </Group>

            {actions && <Group gap="xs">{actions}</Group>}
        </Group>
    );
}
