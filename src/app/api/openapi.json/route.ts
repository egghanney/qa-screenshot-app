import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin || 'https://qa-screenshot-app.vercel.app';

  const openApiSpec = {
    openapi: '3.1.0',
    info: {
      title: 'QA Studio MCP & Storyboard API',
      description: 'Connects ChatGPT Custom GPT directly to QA Studio on Vercel to inspect storyboard evidence, generate exploratory test suites, and sync charters directly into the database.',
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
      '/api/features': {
        get: {
          operationId: 'listFeatures',
          summary: 'List all features in QA Studio',
          description: 'Returns a list of all feature journeys in QA Studio with their titles, IDs, and screen counts so the user can select which flow to explore.',
          responses: {
            '200': {
              description: 'List of features with screen counts.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      total: { type: 'integer' },
                      features: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            purpose: { type: 'string' },
                            screen_count: { type: 'integer' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/prompt-pack': {
        get: {
          operationId: 'getPromptPack',
          summary: 'Get Senior QA Prompt Pack and Screen Evidence Index',
          description: 'Fetches the complete Senior QA prompt pre-loaded with numbered screen evidence (#1 to #N), user actions, and blueprint pillars from QA Studio.',
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
              description: 'Select "part1" for first batch of charters, "part2" for second batch, or "all".'
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
      '/api/charters/sync': {
        post: {
          operationId: 'saveChartersToStudio',
          summary: 'Save generated exploratory charters directly into QA Studio',
          description: 'Uploads and persists the generated charter suite and scenarios directly into the QA Studio database under the specified feature.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['feature', 'charters'],
                  properties: {
                    feature: {
                      type: 'string',
                      description: 'Feature name (e.g. "Buy Food") or feature UUID'
                    },
                    charters: {
                      type: 'array',
                      description: 'Array of generated charter objects with scenarios',
                      items: {
                        type: 'object',
                        required: ['title', 'mission', 'scenarios'],
                        properties: {
                          charter_code: { type: 'string' },
                          title: { type: 'string' },
                          mission: { type: 'string' },
                          user_persona: { type: 'string' },
                          starting_condition: { type: 'string' },
                          expected_outcome: { type: 'string' },
                          priority: { type: 'string' },
                          scenarios: {
                            type: 'array',
                            items: {
                              type: 'object',
                              required: ['prompt_id', 'prompt_text'],
                              properties: {
                                prompt_id: { type: 'string' },
                                prompt_text: { type: 'string' },
                                traceability: { type: 'object' }
                              }
                            }
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
              description: 'Successfully saved charters to QA Studio database',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      charters_saved: { type: 'integer' },
                      scenarios_saved: { type: 'integer' },
                      message: { type: 'string' }
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
          summary: 'Fetch saved charters and evidence context from QA Studio',
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
