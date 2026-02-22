"use client";

import {
  ActionIcon,
  Box,
  Code,
  Collapse,
  CopyButton,
  Group,
  ScrollArea,
  Text,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconCopy,
  IconExternalLink,
} from "@tabler/icons-react";

interface ApiDebugPanelProps {
  data: unknown;
  label?: string;
}

// Auto-extract a URL from common fields in the response data
function extractUrl(data: unknown): string | undefined {
  if (typeof data !== "object" || data === null) return undefined;
  const d = data as Record<string, unknown>;
  const url = d.itemWebUrl ?? d.itemUrl ?? d.url ?? d.ebayUrl;
  return typeof url === "string" && url.startsWith("http") ? url : undefined;
}

export function ApiDebugPanel({ data, label = "API Response" }: ApiDebugPanelProps) {
  const [opened, { toggle }] = useDisclosure(false);
  const json = JSON.stringify(data, null, 2);
  const linkUrl = extractUrl(data);

  return (
    <Box
      style={{
        border: "1px solid var(--mantine-color-orange-3)",
        borderRadius: "var(--mantine-radius-md)",
        overflow: "hidden",
      }}
    >
      <Group
        justify="space-between"
        px="sm"
        py={6}
        style={{
          background: "var(--mantine-color-orange-0)",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={toggle}
      >
        <Group gap="xs">
          <Text size="xs" c="orange" fw={700}>
            DEBUG
          </Text>
          <Text size="xs" c="dimmed">
            {label}
          </Text>
        </Group>

        <Group gap={4}>
          <CopyButton value={json}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? "Copied!" : "Copy JSON"} withArrow>
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color={copied ? "teal" : "orange"}
                  onClick={(e) => {
                    e.stopPropagation();
                    copy();
                  }}
                >
                  {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
          {linkUrl && (
            <Tooltip label="Open in eBay" withArrow>
              <ActionIcon
                size="xs"
                variant="subtle"
                color="orange"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(linkUrl, "_blank", "noopener,noreferrer");
                }}
              >
                <IconExternalLink size={12} />
              </ActionIcon>
            </Tooltip>
          )}
          <ActionIcon size="xs" variant="subtle" color="orange">
            {opened ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
          </ActionIcon>
        </Group>
      </Group>

      <Collapse in={opened}>
        <ScrollArea h={320}>
          <Code block style={{ borderRadius: 0, border: "none" }}>
            {json}
          </Code>
        </ScrollArea>
      </Collapse>
    </Box>
  );
}
