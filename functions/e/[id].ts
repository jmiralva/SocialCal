import { handlePreview } from '../../server/preview';
import type { Env } from '../../server/env';

export const onRequestGet: PagesFunction<Env> = (context) => {
  // If the preview throws, fall through to the static page.
  context.passThroughOnException();
  return handlePreview(context.request, context.env);
};
