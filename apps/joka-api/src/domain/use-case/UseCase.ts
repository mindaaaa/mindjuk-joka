export interface UseCase<Request, Response> {
  get name(): string;
  invoke(request: Request): Promise<Response>;
}
