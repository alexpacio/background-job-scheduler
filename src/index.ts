import { initScheduler } from "./initScheduler";

export async function startProgram() {
    console.log("Starting scheduler");
    const scheduler = await initScheduler();
    console.log("Scheduler started");
    process.once("SIGTERM", () => {
        scheduler.deinit();
    });
    return scheduler;
}

startProgram().catch(console.error);