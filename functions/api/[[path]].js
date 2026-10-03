import { handle } from "../lib/book.js";

export function onRequest(context) {
  return handle(context.request, context.env);
}
