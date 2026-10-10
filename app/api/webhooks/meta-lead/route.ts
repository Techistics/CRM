export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  if (
    p.get("hub.mode") === "subscribe" &&
    p.get("hub.verify_token") === process.env.META_VERIFY_TOKEN
  ) {
    return new Response(p.get("hub.challenge"), { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST() {
  return new Response("ok", { status: 200 });
}