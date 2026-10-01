import { handlePreview } from '../../server/preview';
import type { Env } from '../../server/env';

export const onRequestGet: PagesFunction<Env> = ({ request, env }) => handlePreview(request, env);
