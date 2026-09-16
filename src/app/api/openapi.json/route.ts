import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin || 'https://qa-screenshot-app.vercel.app';

  const openApiSpec = {
    openapi: '3.1.0',
    info: {
      title: 'QA Studio MCP & Storyboard API',
      description: 'Connects ChatGPT Custom GPT directly to QA Studio on Vercel to inspect storyboard evidence and generate 27-charter exploratory test suites.',
      version: '1.0.0'
    },
    servers: [
      {
        url: origin,
        description: 'Current QA Studio instance'
      },
      {
        url: 'https://qa-screenshot-app.vercel.app',
        description: 'Production QA Studio'
      }
    ],
    paths: {
      '/api/prompt-pack': {
        get: {
          operationId: 'getPromptPack',
          summary: 'Get Senior QA Prompt Pack and Screen Evidence Index',
          description: 'Fetches the complete Senior QA prompt pre-loaded with numbered screen evidence (#1 to #17), actions, and blueprint pillars from QA Studio.',
          parameters: [
            {
              name: 'feature',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
                default: 'latest'
              },
              description: 'Feature name (e.g. "Buy Food") or "latest" for the most recent flow.'
            },
            {
              name: 'part',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
                enum: ['all', 'part1', 'part2'],
                default: 'part1'
              },
              description: 'Select "part1" for Charters 01-14, "part2" for Charters 15-27, or "all".'
            }
          ],
          responses: {
            '200': {
              description: 'Successful prompt pack with evidence and instructions.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      feature_id: { type: 'string' },
                      feature_name: { type: 'string' },
                      total_screens: { type: 'integer' },
                      part: { type: 'string' },
                      prompt: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/mcp': {
        post: {
          operationId: 'getMcpSeniorQaPromptPack',
          summary: 'Retrieve Senior QA Prompt Pack via JSON-RPC MCP',
          description: 'Calls the MCP server over HTTP to fetch the Senior QA prompt pack.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['jsonrpc', 'id', 'method', 'params'],
                  properties: {
                    jsonrpc: { type: 'string', default: '2.0' },
                    id: { type: 'integer', default: 1 },
                    method: { type: 'string', default: 'prompts/get' },
                    params: {
                      type: 'object',
                      required: ['name'],
                      properties: {
                        name: { type: 'string', default: 'generate_senior_qa_storyboard_suite' },
                        arguments: {
                          type: 'object',
                          properties: {
                            feature: { type: 'string', default: 'latest' },
                            part: { type: 'string', enum: ['all', 'part1', 'part2'], default: 'part1' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Successful MCP response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      jsonrpc: { type: 'string' },
                      id: { type: 'integer' },
                      result: { type: 'object' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/charters': {
        get: {
          operationId: 'getSavedCharters',
          summary: 'Fetch saved charters and evidence context',
          description: 'Retrieves existing saved charters from the database.',
          parameters: [
            {
              name: 'feature',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
                default: 'latest'
              },
              description: 'Feature name or "latest"'
            }
          ],
          responses: {
            '200': {
              description: 'List of saved charters',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      charters: { type: 'array', items: { type: 'object' } }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  };

  return NextResponse.json(openApiSpec, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    }
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
