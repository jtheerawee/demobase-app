"use client";

import { Badge, Box } from "@mantine/core";

export function ActiveBadge() {
    return (
        <>
            <Badge
                variant="light"
                color="blue"
                size="sm"
                leftSection={
                    <Box
                        className="animate-pulse-blink"
                        style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            backgroundColor: "var(--mantine-color-blue-6)",
                        }}
                    />
                }
            >
                Active
            </Badge>
            <style jsx global>{`
                @keyframes pulse-blink {
                    0% {
                        opacity: 1;
                        transform: scale(1);
                    }
                    50% {
                        opacity: 0.4;
                        transform: scale(0.8);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                .animate-pulse-blink {
                    animation: pulse-blink 1.5s ease-in-out infinite;
                }
            `}</style>
        </>
    );
}
