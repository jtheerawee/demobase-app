"use client";

import { Group, Text, Badge, Loader } from "@mantine/core";
import { ReactNode } from "react";

interface WidgetHeaderProps {
    title: string;
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
        <Group justify="space-between" align="center">
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
                            styles={{ label: { fontSize: "10px" } }}
                        >
                            {count}
                        </Badge>
                    )
                )}
                {actions}
            </Group>
        </Group>
    );
}
