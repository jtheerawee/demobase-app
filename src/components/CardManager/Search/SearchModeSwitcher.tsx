import {
    SegmentedControl,
    Center,
    Box,
    ActionIcon,
} from "@mantine/core";
import {
    IconAlphabetLatin,
    IconCamera,
    IconInfoCircle,
} from "@tabler/icons-react";

export type SearchMode = "text" | "camera";

interface SearchModeSwitcherProps {
    value: SearchMode;
    onChange: (mode: SearchMode) => void;
    onInfoClick?: () => void;
}

export function SearchModeSwitcher({
    value,
    onChange,
    onInfoClick,
}: SearchModeSwitcherProps) {
    return (
        <Box pos="relative" w="100%">
            <Center>
                <SegmentedControl
                    value={value}
                    onChange={(val) =>
                        onChange(val as SearchMode)
                    }
                    data={[
                        {
                            value: "text",
                            label: (
                                <Center style={{ gap: 10 }}>
                                    <IconAlphabetLatin
                                        size={16}
                                    />
                                    <span>Text Search</span>
                                </Center>
                            ),
                        },
                        {
                            value: "camera",
                            label: (
                                <Center style={{ gap: 10 }}>
                                    <IconCamera size={16} />
                                    <span>Camera</span>
                                </Center>
                            ),
                        },
                    ]}
                />
            </Center>
            <ActionIcon
                variant="subtle"
                color="gray"
                pos="absolute"
                right={0}
                top="50%"
                style={{ transform: "translateY(-50%)" }}
                onClick={onInfoClick}
            >
                <IconInfoCircle size={18} />
            </ActionIcon>
        </Box>
    );
}
