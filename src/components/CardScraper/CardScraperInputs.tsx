"use client";

import { Button, Select, Stack } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";

interface CardScraperInputsProps {
    value?: string | null;
    onChange?: (value: string | null) => void;
    onDownload?: () => void;
    loading?: boolean;
}

export function CardScraperInputs({ value, onChange, onDownload, loading }: CardScraperInputsProps) {
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
                onClick={onDownload}
                loading={loading}
                disabled={!value}
            >
                Download Collection
            </Button>
        </Stack>
    );
}
