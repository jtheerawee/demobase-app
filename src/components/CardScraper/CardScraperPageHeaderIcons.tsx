import { ActionIcon, Group, Tooltip } from "@mantine/core";
import { IconSettings, IconTrash } from "@tabler/icons-react";

interface CardScraperPageHeaderIconsProps {
    onDeleteAllDatabaseCollections: () => void;
    collectionLoading: boolean;
    onOpenSettings: () => void;
}

export function CardScraperPageHeaderIcons({
    onDeleteAllDatabaseCollections,
    collectionLoading,
    onOpenSettings,
}: CardScraperPageHeaderIconsProps) {
    return (
        <Group gap="xs">
            <Tooltip label="Delete All Database Collections" color="red" withArrow>
                <ActionIcon
                    variant="subtle"
                    color="red"
                    size="lg"
                    radius="md"
                    onClick={onDeleteAllDatabaseCollections}
                    loading={collectionLoading}
                >
                    <IconTrash size={22} />
                </ActionIcon>
            </Tooltip>
            <Tooltip label="Scraper Settings" withArrow>
                <ActionIcon variant="subtle" color="gray" size="lg" radius="md" onClick={onOpenSettings}>
                    <IconSettings size={22} />
                </ActionIcon>
            </Tooltip>
        </Group>
    );
}
