import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getGeminiClient, GEMINI_MODELS, GEMINI_CONFIG, base64ToGeminiFormat } from '@/lib/gemini/client';
import { requireAuth } from '@/lib/api/auth';
import { FunctionCallingConfigMode } from '@google/genai';
import {
  getFunctionRiskLevel,
  AI_RISK_LEVELS,
  checkActionRateLimit,
  checkBulkOperationLimit,
  generateSessionId,
} from '@/lib/ai/ai-command-service';
import { AIRiskLevel } from '@/types';
import {
  MessageWithImage,
  ExecutionContext,
} from '@/lib/ai-assistant/types';
import {
  SYSTEM_PROMPT,
  getToolDescription,
} from '@/lib/ai-assistant/constants';
import {
  createToolStreamEvent,
  isInvalidResponse,
  messageRequiresFunction,
  getFallbackResponse,
} from '@/lib/ai-assistant/utils';
import { withRateLimit } from '@/lib/rate-limit';

import { logger } from '@/lib/logger';

// Zod schema for request validation
const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(10000),
  image: z.string().max(10 * 1024 * 1024).optional(),
});

const AssistantRequestSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(50),
  conversationContext: z.record(z.string(), z.unknown()).optional(),
  stream: z.boolean().optional(),
  householdId: z.string().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  executeDirectly: z.boolean().optional(),
});

// Import function declarations and orchestrator
import { functionDeclarations } from './functions';
import {
  executeFunction,
  executeFunctionWithLogging,
  createFunctionProposal,
  shouldCreateProposal,
} from './orchestrator';

// ============================================
// API ROUTE
// ============================================

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  logger.info('POST request received');
  try {
    // Rate limiting
    const rateLimitId = request.headers.get('x-user-id') || request.headers.get('x-forwarded-for') || 'anonymous';
    const rateLimit = await withRateLimit(rateLimitId, 'ai-chat');

    if (!rateLimit.allowed) {
      return NextResponse.json(rateLimit.response, {
        status: 429,
        headers: rateLimit.headers,
      });
    }

    // Parse and validate request body with Zod
    let validatedBody;
    try {
      const rawBody = await request.json();
      validatedBody = AssistantRequestSchema.parse(rawBody);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Datos de entrada inválidos',
            details: validationError.issues.map(e => `${e.path.join('.')}: ${e.message}`)
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Error parsing request body' },
        { status: 400 }
      );
    }

    logger.info('Request body parsed', { messagesCount: validatedBody.messages?.length });
    const {
      messages,
      conversationContext,
      stream = false,
      // AI Command Center parameters
      householdId,
      userId,
      sessionId: providedSessionId,
      // If true, skip proposals and execute directly (for approved proposals)
      executeDirectly = false,
    } = validatedBody;

    // Create execution context
    const sessionId = providedSessionId || generateSessionId();
    const context: ExecutionContext = {
      householdId: householdId || 'default-household',
      userId,
      sessionId,
    };

    const gemini = getGeminiClient();

    // Build enhanced system prompt with context
    let enhancedSystemPrompt = SYSTEM_PROMPT;

    if (conversationContext) {
      const { history, lastTopic, preferences } = conversationContext;

      if (history && typeof history === 'string' && history.trim()) {
        enhancedSystemPrompt += `\n\n## CONTEXTO ANTERIOR\n${history}`;
      }

      if (lastTopic) {
        enhancedSystemPrompt += `\n\nTema actual: ${lastTopic}`;
      }

      if (preferences && typeof preferences === 'object' && Object.keys(preferences).length > 0) {
        const prefs = preferences as Record<string, unknown>;
        const favRecipes = prefs.favoriteRecipes as string[] | undefined;
        const disliked = prefs.dislikedIngredients as string[] | undefined;
        const restrictions = prefs.dietaryRestrictions as string[] | undefined;
        if (favRecipes?.length) {
          enhancedSystemPrompt += `\nRecetas favoritas: ${favRecipes.join(', ')}`;
        }
        if (disliked?.length) {
          enhancedSystemPrompt += `\nNo le gusta: ${disliked.join(', ')}`;
        }
        if (restrictions?.length) {
          enhancedSystemPrompt += `\nRestricciones: ${restrictions.join(', ')}`;
        }
      }
    }

    // Convert messages to Gemini format (with image support)
    const geminiMessages = messages.map((msg: MessageWithImage) => {
      const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];

      if (msg.content) {
        parts.push({ text: msg.content });
      }

      if (msg.image) {
        const imageData = base64ToGeminiFormat(msg.image);
        parts.push(imageData);
      }

      return {
        role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
        parts
      };
    });

    // First Gemini call with function declarations
    let response;
    try {
      logger.info('Calling Gemini API', { model: GEMINI_MODELS.FLASH });
      response = await gemini.models.generateContent({
        model: GEMINI_MODELS.FLASH,
        contents: geminiMessages,
        config: {
          temperature: GEMINI_CONFIG.assistant.temperature,
          maxOutputTokens: GEMINI_CONFIG.assistant.maxOutputTokens,
          systemInstruction: enhancedSystemPrompt,
          tools: [{
            functionDeclarations
          }],
          toolConfig: {
            functionCallingConfig: {
              mode: FunctionCallingConfigMode.AUTO
            }
          }
        }
      });
      logger.info('Gemini API response received');
    } catch (geminiError) {
      logger.error('Gemini API error', { error: geminiError instanceof Error ? geminiError.message : String(geminiError) });
      const errorMsg = geminiError instanceof Error ? geminiError.message : String(geminiError);
      throw new Error(`Gemini API error: ${errorMsg}`);
    }

    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    // Check for function calls in response
    const functionCalls = parts.filter(part => part.functionCall);

    const lastUserMessage = messages[messages.length - 1]?.content || '';
    logger.info('User message', { message: lastUserMessage.substring(0, 100) });
    logger.info('Function calls count', { count: functionCalls.length });

    // Check if message required a function but none was called
    const functionRequirement = messageRequiresFunction(lastUserMessage);
    if (functionCalls.length === 0 && functionRequirement.required) {
      logger.info('Message required function but none was called, forcing', { suggestedFunction: functionRequirement.suggestedFunction });

      const forcedFunctionCall = {
        name: functionRequirement.suggestedFunction!,
        args: {} as Record<string, unknown>
      };

      // Extract recipe name for get_recipe_details
      if (functionRequirement.suggestedFunction === 'get_recipe_details') {
        const msg = lastUserMessage.toLowerCase();
        const patterns = [/cómo (?:hago|preparo|hacer|preparar) (?:una?|el|la|los|las)?\s*(.+)/i,
                         /como (?:hago|preparo|hacer|preparar) (?:una?|el|la|los|las)?\s*(.+)/i];
        for (const pattern of patterns) {
          const match = msg.match(pattern);
          if (match) {
            forcedFunctionCall.args = { recipe_name: match[1].trim().replace(/\?$/, '') };
            break;
          }
        }
      }

      const forcedResult = await executeFunction(forcedFunctionCall.name, forcedFunctionCall.args);
      logger.info('Forced function result', { result: JSON.stringify(forcedResult).substring(0, 200) });

      const contextMessage = `El usuario preguntó: "${lastUserMessage}"

Resultado de consultar ${forcedFunctionCall.name}:
${JSON.stringify(forcedResult, null, 2)}

Basándote en estos datos, responde al usuario de forma útil y amigable.`;

      const followUpResponse = await gemini.models.generateContent({
        model: GEMINI_MODELS.FLASH,
        contents: [{ role: 'user', parts: [{ text: contextMessage }] }],
        config: {
          temperature: GEMINI_CONFIG.assistant.temperature,
          maxOutputTokens: GEMINI_CONFIG.assistant.maxOutputTokens,
          systemInstruction: enhancedSystemPrompt,
        }
      });

      const forcedContent = followUpResponse.candidates?.[0]?.content?.parts?.[0]?.text || 'Hubo un problema al procesar tu solicitud.';

      if (stream) {
        const streamData = createToolStreamEvent({
          type: 'content',
          content: forcedContent
        });
        const doneData = createToolStreamEvent({ type: 'done', done: true, sessionId });

        return new Response(streamData + doneData, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }

      return NextResponse.json({
        content: forcedContent,
        role: 'assistant',
        sessionId,
        forcedFunction: forcedFunctionCall.name,
      });
    }

    if (functionCalls.length === 0) {
      const textResponse = parts.find(part => part.text)?.text || '';
      logger.info('No functions called, text response', { response: textResponse.substring(0, 200) });
    }

    if (functionCalls.length > 0) {
      const parsedCalls = functionCalls
        .map(part => part.functionCall!)
        .filter(fc => fc.name)
        .map(fc => ({
          name: fc.name!,
          args: (fc.args as Record<string, unknown>) || {}
        }));

      // Check for write operations
      const writeOperations = parsedCalls.filter(fc =>
        !fc.name.startsWith('get_') &&
        !fc.name.startsWith('search_') &&
        !fc.name.startsWith('suggest_') &&
        fc.name !== 'calculate_portions'
      );

      // ============================================
      // GUARDRAILS: Rate Limiting & Bulk Operation Checks
      // ============================================
      if (writeOperations.length > 0 && householdId) {
        let maxRiskLevel: AIRiskLevel = AI_RISK_LEVELS.LOW as AIRiskLevel;
        for (const fc of writeOperations) {
          const riskLevel = await getFunctionRiskLevel(fc.name);
          if (riskLevel > maxRiskLevel) {
            maxRiskLevel = riskLevel;
          }
        }

        const rateLimitCheck = await checkActionRateLimit(
          householdId,
          maxRiskLevel,
          writeOperations.length
        );

        if (!rateLimitCheck.allowed) {
          return NextResponse.json({
            type: 'error',
            content: `${rateLimitCheck.reason}\n\nPor favor, espera un momento antes de realizar más acciones.`,
            role: 'assistant',
            rateLimited: true,
            sessionId,
          });
        }

        for (const fc of writeOperations) {
          if (fc.name === 'bulk_update_inventory' && fc.args.items) {
            const itemCount = (fc.args.items as unknown[]).length;
            const bulkCheck = await checkBulkOperationLimit(householdId, itemCount);

            if (!bulkCheck.allowed) {
              return NextResponse.json({
                type: 'error',
                content: `${bulkCheck.reason}\n\nEl límite actual es de ${bulkCheck.limit} items por operación. Intenta dividir la operación en partes más pequeñas.`,
                role: 'assistant',
                bulkLimited: true,
                sessionId,
              });
            }
          }
        }
      }

      // Create proposal for high-risk operations (unless executeDirectly)
      if (writeOperations.length > 0 && !executeDirectly && householdId) {
        const needsProposal = await shouldCreateProposal(
          writeOperations.map(fc => fc.name),
          householdId
        );

        if (needsProposal) {
          const proposal = await createFunctionProposal(writeOperations, context);

          return NextResponse.json({
            type: 'proposal',
            content: `He preparado un plan que requiere tu aprobación:\n\n**${proposal.summary}**\n\nEste plan incluye ${proposal.actions.length} acción(es) que modificarán datos. ¿Quieres que lo ejecute?`,
            role: 'assistant',
            proposal,
            sessionId,
          });
        }
      }

      // Execute all functions — streaming mode
      if (stream) {
        const readableStream = new ReadableStream({
          async start(controller) {
            try {
              const functionResponses = [];
              const executionMetadata: Array<{ functionName: string; auditLogId?: string; canUndo: boolean }> = [];

              for (const fc of parsedCalls) {
                controller.enqueue(new TextEncoder().encode(
                  createToolStreamEvent({
                    type: 'tool_start',
                    tool: {
                      name: fc.name,
                      description: getToolDescription(fc.name),
                      args: fc.args,
                    },
                  })
                ));

                let result: unknown;
                let auditLogId: string | undefined;
                let canUndo = false;

                if (householdId) {
                  const executionResult = await executeFunctionWithLogging(fc.name, fc.args, context);
                  result = executionResult.result;
                  auditLogId = executionResult.auditLogId;
                  canUndo = executionResult.canUndo;
                } else {
                  result = await executeFunction(fc.name, fc.args);
                }

                const isSuccess = typeof result === 'object' && result !== null
                  ? (result as Record<string, unknown>).success !== false
                  : true;

                controller.enqueue(new TextEncoder().encode(
                  createToolStreamEvent({
                    type: 'tool_result',
                    tool: { name: fc.name },
                    result: {
                      success: isSuccess,
                      summary: typeof result === 'object' && result !== null
                        ? ((result as Record<string, unknown>).message as string) || getToolDescription(fc.name) + ' completado'
                        : 'Completado',
                    },
                  })
                ));

                functionResponses.push({
                  functionResponse: {
                    name: fc.name,
                    response: result,
                  },
                });

                executionMetadata.push({ functionName: fc.name, auditLogId, canUndo });
              }

              // Stream AI response based on function results
              const streamResponse = await gemini.models.generateContentStream({
                model: GEMINI_MODELS.FLASH,
                contents: [
                  ...geminiMessages,
                  { role: 'model' as const, parts: parts },
                  { role: 'user' as const, parts: functionResponses },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ] as any,
                config: {
                  temperature: GEMINI_CONFIG.assistant.temperature,
                  maxOutputTokens: GEMINI_CONFIG.assistant.maxOutputTokens,
                  systemInstruction: enhancedSystemPrompt,
                },
              });

              for await (const chunk of streamResponse) {
                const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (text) {
                  controller.enqueue(new TextEncoder().encode(
                    createToolStreamEvent({ type: 'content', content: text, done: false })
                  ));
                }
              }

              const undoableActions = executionMetadata.filter(m => m.canUndo);
              const streamMetadata = executionMetadata.length > 0 ? {
                actionsExecuted: executionMetadata.length,
                undoAvailable: undoableActions.length > 0,
                undoableActions: undoableActions.map(a => ({
                  functionName: a.functionName,
                  auditLogId: a.auditLogId,
                })),
              } : undefined;

              controller.enqueue(new TextEncoder().encode(
                createToolStreamEvent({
                  type: 'done',
                  done: true,
                  sessionId,
                  executionMetadata: streamMetadata,
                })
              ));

              controller.close();
            } catch (error) {
              logger.error('Tool streaming error', { error: error instanceof Error ? error.message : String(error) });
              controller.error(error);
            }
          },
        });

        return new Response(readableStream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }

      // Non-streaming execution
      const functionResponses = [];
      const executionMetadata: Array<{ functionName: string; auditLogId?: string; canUndo: boolean }> = [];

      for (const fc of parsedCalls) {
        let result: unknown;
        let auditLogId: string | undefined;
        let canUndo = false;

        if (householdId) {
          const executionResult = await executeFunctionWithLogging(fc.name, fc.args, context);
          result = executionResult.result;
          auditLogId = executionResult.auditLogId;
          canUndo = executionResult.canUndo;
        } else {
          result = await executeFunction(fc.name, fc.args);
        }

        functionResponses.push({
          functionResponse: {
            name: fc.name,
            response: result
          }
        });

        executionMetadata.push({ functionName: fc.name, auditLogId, canUndo });
      }

      const finalResponse = await gemini.models.generateContent({
        model: GEMINI_MODELS.FLASH,
        contents: [
          ...geminiMessages,
          { role: 'model' as const, parts: parts },
          { role: 'user' as const, parts: functionResponses }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ] as any,
        config: {
          temperature: GEMINI_CONFIG.assistant.temperature,
          maxOutputTokens: GEMINI_CONFIG.assistant.maxOutputTokens,
          systemInstruction: enhancedSystemPrompt,
        }
      });

      let finalContent = finalResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!finalContent || isInvalidResponse(finalContent)) {
        const lastUserMsg = messages[messages.length - 1]?.content || '';
        finalContent = getFallbackResponse(lastUserMsg);
        logger.warn('Invalid response detected, using fallback');
      }

      const undoableActions = executionMetadata.filter(m => m.canUndo);

      return NextResponse.json({
        content: finalContent,
        role: 'assistant',
        sessionId,
        executionMetadata: executionMetadata.length > 0 ? {
          actionsExecuted: executionMetadata.length,
          undoAvailable: undoableActions.length > 0,
          undoableActions: undoableActions.map(a => ({
            functionName: a.functionName,
            auditLogId: a.auditLogId,
          })),
        } : undefined,
      });
    }

    // No function calls — streaming text response
    if (stream) {
      const textContent = parts.find(part => part.text)?.text || '';
      const chunks = textContent.split(/(\s+)/).filter(Boolean);

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            let chunkBuffer = '';

            for (let i = 0; i < chunks.length; i++) {
              chunkBuffer += chunks[i];

              const shouldFlush =
                i % 4 === 3 ||
                /[.!?:,\n]$/.test(chunkBuffer) ||
                i === chunks.length - 1;

              if (shouldFlush && chunkBuffer.trim()) {
                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({ content: chunkBuffer, done: false })}\n\n`
                  )
                );
                chunkBuffer = '';
                await new Promise(resolve => setTimeout(resolve, 10));
              }
            }

            if (chunkBuffer.trim()) {
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ content: chunkBuffer, done: false })}\n\n`
                )
              );
            }

            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ content: '', done: true })}\n\n`
              )
            );
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        }
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming text response
    let textContent = parts.find(part => part.text)?.text || '';

    if (!textContent || isInvalidResponse(textContent)) {
      const lastUserMsg = messages[messages.length - 1]?.content || '';
      textContent = getFallbackResponse(lastUserMsg);
      logger.warn('Invalid response detected (no function calls), using fallback');
    }

    return NextResponse.json({
      content: textContent,
      role: 'assistant'
    });

  } catch (error) {
    logger.error('AI Assistant error', { error: error instanceof Error ? error.message : String(error) });

    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('timeout') || errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return NextResponse.json({
        content: 'Tuve un problema de conexión. Por favor intenta de nuevo en unos segundos.',
        role: 'assistant'
      });
    }

    if (errorMessage.includes('SAFETY') || errorMessage.includes('blocked')) {
      return NextResponse.json({
        content: 'Lo siento, no puedo procesar esa solicitud. ¿En qué más puedo ayudarte?',
        role: 'assistant'
      });
    }

    if (errorMessage.includes('API_KEY') || errorMessage.includes('apiKey') || errorMessage.includes('GEMINI')) {
      logger.error('Gemini API Key error - check GOOGLE_GEMINI_API_KEY env variable');
      return NextResponse.json({
        content: 'Error de configuración del asistente IA. Contacta al administrador.',
        role: 'assistant'
      });
    }

    return NextResponse.json(
      { error: 'Error processing request', details: errorMessage },
      { status: 500 }
    );
  }
}
