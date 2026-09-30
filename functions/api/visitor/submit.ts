import { handleSubmit, type VisitorEnv } from '../../../src/visitor/server';

interface Context { request: Request; env: VisitorEnv }

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  const ip = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0';
  return handleSubmit(request, env, ip);
};
