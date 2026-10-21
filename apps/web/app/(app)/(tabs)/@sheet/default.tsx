/**
 * No sheet open: the slot draws nothing (every route of the tabs but the intercepted /add).
 *
 * default.tsx only answers a hard load. On a soft navigation Next keeps a parallel slot's previous state when the new URL does not match
 * one of its pages, so an add made from Khám phá (router.replace("/app")) would leave the sheet mounted over Hôm nay, closed but with
 * the screen under it still inert. The four tabs therefore have a page of their own in the slot (@sheet/app, explore, trends, settings)
 * that draws nothing. A catch-all ([...catchAll]) would do it in one file, but the build refuses it: with strict route matching it
 * leaves /add without a canonical route.
 */
export default function NoSheet() {
  return null;
}
