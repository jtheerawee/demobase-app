import { Card, CardSection, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

interface WidgetCardProps {
    title: string;
    href: string;
    icon?: ReactNode;
}

export function WidgetCard({
    title,
    href,
    icon,
}: WidgetCardProps) {
    return (
        <Link
            href={href}
            style={{ textDecoration: "none" }}
        >
            <Card
                shadow="sm"
                padding="xl"
                radius="md"
                withBorder
                style={{
                    cursor: "pointer",
                    height: "100%",
                }}
                styles={{
                    root: {
                        transition:
                            "box-shadow 150ms ease, transform 150ms ease",
                        "&:hover": {
                            boxShadow:
                                "var(--mantine-shadow-md)",
                            transform: "translateY(-2px)",
                        },
                    },
                }}
            >
                {icon && (
                    <CardSection inheritPadding py="sm">
                        {icon}
                    </CardSection>
                )}
                <Text fw={600} size="lg">
                    {title}
                </Text>
            </Card>
        </Link>
    );
}
