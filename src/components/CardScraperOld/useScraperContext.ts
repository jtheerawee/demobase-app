import { usePathname } from "next/navigation";

export function useScraperContext() {
    const pathname = usePathname();
    const segments = pathname.split("/");
    // Assuming structure: /[locale]/card-scraper/[franchise]/[language]
    const franchise = segments[3];
    const language = segments[4];

    return { franchise, language };
}
