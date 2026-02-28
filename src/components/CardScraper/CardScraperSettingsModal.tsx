import { Modal, Stack, NumberInput, Button, Text } from "@mantine/core";

interface CardScraperSettingsModalProps {
    opened: boolean;
    onClose: () => void;
    limit: number;
    onLimitChange: (val: number) => void;
}

export function CardScraperSettingsModal({ opened, onClose, limit, onLimitChange }: CardScraperSettingsModalProps) {
    return (
        <Modal opened={opened} onClose={onClose} title={<Text fw={700}>Scraper Settings</Text>} radius="md">
            <Stack gap="md">
                <NumberInput
                    label="Max cards per collection"
                    description="Limit the number of cards to scrape from each set."
                    value={limit}
                    onChange={(val) => {
                        const num = Number(val);
                        onLimitChange(num);
                        localStorage.setItem("scraper_card_limit", num.toString());
                    }}
                    min={1}
                    max={1000}
                />
                <Button onClick={onClose} fullWidth>
                    Save & Close
                </Button>
            </Stack>
        </Modal>
    );
}
