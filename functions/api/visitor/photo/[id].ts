import { handlePhoto, type VisitorEnv } from '../../../../src/visitor/server';

interface Context { request: Request; env: VisitorEnv; params: { id: string } }

export const onRequestGet = async ({ request, env, params }: Context): Promise<Response> => {
  const token = request.headers.get('x-admin-token') ?? '';
  const admin = Boolean(env.ADMIN_TOKEN) && token === env.ADMIN_TOKEN;
  return handlePhoto(env, params.id, admin);
};
