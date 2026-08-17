import { createServer } from "node:http";
import { getHarnessScaffoldStatus } from "@workbuddy/harness";
import { scaffoldStatusSchema } from "@workbuddy/contracts";

const port = Number(process.env.PORT ?? 8787);

const server = createServer((request, response) => {
  if (request.url === "/health") {
    const payload = scaffoldStatusSchema.parse(getHarnessScaffoldStatus());
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(payload));
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "not_found" }));
});

server.listen(port, "127.0.0.1", () => {
  console.log(`WorkBuddy API scaffold: http://127.0.0.1:${port}`);
});

