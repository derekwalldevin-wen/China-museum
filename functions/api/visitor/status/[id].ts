import { handleStatus, type VisitorEnv } from '../../../../src/visitor/server';

interface Context { env: VisitorEnv; params: { id: string } }

export const onRequestGet = async ({ env, params }: Context): Promise<Response> => handleStatus(env, params.id);
