import {
  closeRenderQueueConnections,
  isRenderQueueEnabled,
  startRenderQueueWorker,
} from './services/render-queue';

if (!isRenderQueueEnabled()) {
  console.error('RENDER_QUEUE_ENABLED must be true to run the render worker');
  process.exit(1);
}

startRenderQueueWorker();

console.log('Render queue worker started');

async function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down render worker...`);
  await closeRenderQueueConnections();
  process.exit(0);
}

process.on('SIGINT', () => {
  shutdown('SIGINT').catch((err) => {
    console.error('Failed to shutdown worker:', err);
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM').catch((err) => {
    console.error('Failed to shutdown worker:', err);
    process.exit(1);
  });
});
