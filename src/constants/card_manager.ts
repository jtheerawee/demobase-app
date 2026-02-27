export const CARD_MANAGER_CONFIG = {
    // Layout Spans (Mantine Grid 12-cols)
    LAYOUT: {
        COLLECTION_SPAN: 3,
        RESULTS_SPAN: 3,
        CONTROLS_SPAN: 6,
    },
    CAMERA_DEVICES_WIDTH: "calc(33.33% - 15px)",

    // Search
    SEARCH: {
        MIN_CHARS: 3,
        RESULTS_PER_ROW: 1,
        PREVIEW_IMAGE_WIDTH: 400,
    },
} as const;
