import { getDataHubClient } from "./client";

export async function search(query: string) {
  const client = await getDataHubClient();

  return client.callTool({
    name: "search",
    arguments: {
      query,
    },
  });
}