"use client";

import { Button, Select, Stack } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";

interface CardScraperInputsProps {
    value?: string | null;
    onChange?: (value: string | null) => void;
}

export function CardScraperInputs({ value, onChange }: CardScraperInputsProps) {
    return (
        <Stack gap="md">
            <Select
                placeholder="Choose a franchise"
                value={value}
                onChange={onChange}
                data={[
                    { value: "mtg", label: "MTG" },
                    { value: "pokemon", label: "Pokémon" },
                    { value: "one-piece", label: "One Piece" },
                    { value: "lorcana", label: "Lorcana" },
                ]}
            />
            <Button
                leftSection={<IconDownload size={16} />}
                variant="filled"
                color="blue"
                fullWidth
            >
                Download Collection
            </Button>
        </Stack>
    );
}
