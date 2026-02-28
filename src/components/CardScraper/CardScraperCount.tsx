"use client";

import { Badge, Group, Text } from "@mantine/core";

interface CardScraperCountProps {
    label: string;
    count: number;
    subLabel?: string;
    color?: string;
}

export function CardScraperCount({ label, count, subLabel, color = "blue" }: CardScraperCountProps) {
    return (
        <Group gap="xs" align="center">
            <Text fw={700} size="sm">
                {label}
            </Text>
            <Badge variant="light" color={color} radius="sm" size="sm">
                {count} {subLabel}
            </Badge>
        </Group>
    );
}
