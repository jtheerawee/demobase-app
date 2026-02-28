import { Modal, ScrollArea, Stack, Text } from "@mantine/core";

export interface StatsModalProps {
    opened: boolean;
    onClose: () => void;
    title: string | undefined;
    items: any[] | undefined;
}

export function StatsModal({ opened, onClose, title, items }: StatsModalProps) {
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={<Text fw={700}>{title}</Text>}
            scrollAreaComponent={ScrollArea.Autosize}
        >
            {items && items.length > 0 ? (
                <Stack gap={4}>
                    {items.map((c, i) => (
                        <Text key={i} size="xs">
                            {c.collectionCode || c.cardNo ? `#${c.collectionCode || c.cardNo} ` : ""}{c.name}
                        </Text>
                    ))}
                </Stack>
            ) : (
                <Text size="sm" c="dimmed">No items.</Text>
            )}
        </Modal>
    );
}
