import { Container, Stack } from "@mantine/core";
import { PageHeader } from "@/components/PageHeader";
import { IconLayoutDashboard } from "@tabler/icons-react";

export default function CardManagerPage() {
    return (
        <Container size="xl" py="md">
            <Stack gap="lg">
                <PageHeader
                    title="Card Manager"
                    description="Manage your card collection and inventory"
                    icon={
                        <IconLayoutDashboard
                            size={32}
                            color="var(--mantine-color-grape-6)"
                        />
                    }
                />
                {/* Content will go here */}
            </Stack>
        </Container>
    );
}
