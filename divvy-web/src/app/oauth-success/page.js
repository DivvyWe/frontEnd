// app/oauth-success/page.js
export const dynamic = "force-dynamic"; // mark as dynamic on the SERVER side

import OAuthSuccessClient from "./OAuthSuccessClient";

export default function Page() {
  return <OAuthSuccessClient />;
}
