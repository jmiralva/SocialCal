import { handleApi, type Env } from '../../server/router';

export const onRequest: PagesFunction<Env> = ({ request, env }) => handleApi(request, env);
