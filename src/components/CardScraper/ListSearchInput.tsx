import { ActionIcon, TextInput } from "@mantine/core";
import { IconSearch, IconX } from "@tabler/icons-react";

interface ListSearchInputProps {
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
}

export function ListSearchInput({ placeholder, value, onChange }: ListSearchInputProps) {
    return (
        <TextInput
            placeholder={placeholder}
            leftSection={<IconSearch size={14} />}
            rightSection={
                value ? (
                    <ActionIcon size="xs" color="gray" variant="subtle" onClick={() => onChange("")}>
                        <IconX size={12} />
                    </ActionIcon>
                ) : null
            }
            value={value}
            onChange={(e) => onChange(e.currentTarget.value)}
            size="xs"
            radius="md"
        />
    );
}
