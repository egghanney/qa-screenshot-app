import { NextRequest, NextResponse } from 'next/server';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createMcpServer } from '@/lib/mcp/server/mcpServerInstance';

// Route segment config: Mark as dynamic and disable static generation
export const dynamic = 'force-dynamic';

function validateAuth(req: NextRequest): boolean {
  const expectedToken = process.env.MCP_AUTH_TOKEN;
  if (!expectedToken) return true; // Open access in local / internal QA environment if not configured

  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token === expectedToken) return true;
  }

  const url = new URL(req.url);
  if (url.searchParams.get('token') === expectedToken) return true;

  return false;
}

async function handleMcpRequest(req: NextRequest): Promise<Response> {
  // 1. Optional token authentication
  if (!validateAuth(req)) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid or missing MCP token.' },
      { status: 401 }
    );
  }

  // 2. Instantiate MCP Server and Transport
  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true
  });

  await server.connect(transport);

  // 3. Normalize Accept header to satisfy Streamable HTTP spec for all clients (ChatGPT, Claude, Cursor, curl)
  const newHeaders = new Headers(req.headers);
  newHeaders.set('accept', 'application/json, text/event-stream');
  if (req.method === 'POST' && (!newHeaders.get('content-type') || newHeaders.get('content-type')?.includes('*/*'))) {
    newHeaders.set('content-type', 'application/json');
  }

  const effectiveReq = new Request(req.url, {
    method: req.method,
    headers: newHeaders,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body,
    // @ts-ignore
    duplex: 'half'
  });

  // 4. Handle request via MCP Transport
  const response = await transport.handleRequest(effectiveReq);
  return response;
}

export async function GET(req: NextRequest) {
  try {
    return await handleMcpRequest(req);
  } catch (err: any) {
    console.error('Error handling MCP GET request:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    return await handleMcpRequest(req);
  } catch (err: any) {
    console.error('Error handling MCP POST request:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-MCP-Session-Id'
    }
  });
}
