// Retired provider entry point. Accounts now use the site-owned sign-in form.
export async function GET(req: Request) {
  return Response.redirect(new URL("/account", req.url), 303);
}
