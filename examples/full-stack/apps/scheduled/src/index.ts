export default {
  async scheduled(controller: ScheduledController): Promise<void> {
    // Define a product schedule, idempotency key, overlap policy, and failure alerts before release.
    console.log('Scheduled trigger', controller.scheduledTime);
  },
};
