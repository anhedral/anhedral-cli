export interface ApplicationContext {
  api?: { fetch(request: Request): Promise<Response> };
}
