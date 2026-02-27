"use client";

import { Badge, Divider, Group, Loader, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";

interface WidgetHeaderProps {
    title: ReactNode;
    count?: number;
    loading?: boolean;
    badgeColor?: string;
    actions?: ReactNode;
}

export function WidgetHeader({
    title,
    count,
    loading,
    badgeColor = "blue",
    actions,
}: WidgetHeaderProps) {
    return (
        <Stack gap={0}>
            <Group justify="space-between" align="center" px="sm" py="xs">
                <Text fw={700} size="lg">
                    {title}
                </Text>
                <Group gap="xs">
                    {loading ? (
                        <Loader size="xs" />
                    ) : (
                        count !== undefined &&
                        count > 0 && (
                            <Badge
                                color={badgeColor}
                                variant="filled"
                                h={18}
                                styles={{
                                    label: {
                                        fontSize: "10px",
                                    },
                                }}
                            >
                                {count}
                            </Badge>
                        )
                    )}
                    {actions}
                </Group>
            </Group>
            <Divider />
        </Stack>
    );
}
