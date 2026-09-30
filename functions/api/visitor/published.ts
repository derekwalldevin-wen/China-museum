import { handlePublished, type VisitorEnv } from '../../../src/visitor/server';

interface Context { env: VisitorEnv }

export const onRequestGet = async ({ env }: Context): Promise<Response> => handlePublished(env);
