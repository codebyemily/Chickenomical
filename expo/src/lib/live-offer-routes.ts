function routeWithJobId(route: 'offer' | 'source', recordId: string, jobId?: string) {
  const path = `/${route}/${encodeURIComponent(recordId)}`;
  return jobId ? `${path}?jobId=${encodeURIComponent(jobId)}` : path;
}

export function offerDetailRoute(offerId: string, jobId?: string) {
  return routeWithJobId('offer', offerId, jobId);
}

export function sourceRecordRoute(sourceId: string, jobId?: string) {
  return routeWithJobId('source', sourceId, jobId);
}
