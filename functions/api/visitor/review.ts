import { handleReview, type VisitorEnv } from '../../../src/visitor/server';

interface Context { request: Request; env: VisitorEnv }

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => handleReview(request, env);
