import { SCRAPER_MESSAGE_TYPE } from "./types";

export function createWorkerUpdater(send: (msg: any) => void) {
    let activeWorkers = 0;
    return (delta: number) => {
        activeWorkers += delta;
        send({ type: SCRAPER_MESSAGE_TYPE.WORKERS, count: activeWorkers });
    };
}

export function createStepLogger(send: (msg: any) => void) {
    return (message: string) => {
        send({
            type: SCRAPER_MESSAGE_TYPE.STEP,
            message,
        });
    };
}
