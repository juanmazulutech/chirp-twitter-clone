import type { ErrorCode, ErrorResponse, FieldErrors } from '@chirp/shared';
import type { FastifyError } from 'fastify';
import fp from 'fastify-plugin';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';

import { DomainError } from '../lib/errors';

type ErrorDetails = NonNullable<ErrorResponse['error']['details']>;

function errorBody(code: ErrorCode, message: string, details?: ErrorDetails): ErrorResponse {
  return { error: { code, message, ...(details && { details }) } };
}

/** Groups schema issues by field path; issues on the payload root become form errors. */
function toDetails(
  issues: ReadonlyArray<{ instancePath: string; message?: string }>,
): ErrorDetails {
  const fieldErrors: FieldErrors = {};
  const formErrors: string[] = [];

  for (const issue of issues) {
    const path = issue.instancePath.replace(/^\//, '').replaceAll('/', '.');
    const message = issue.message ?? 'Invalid value';
    if (path) (fieldErrors[path] ??= []).push(message);
    else formErrors.push(message);
  }

  return { fieldErrors, formErrors };
}

/**
 * Translates every failure into the API error format (ARCHITECTURE.md §3.3).
 * Internal details of unexpected errors are logged, never sent to the client.
 */
export default fp(
  function errorsPlugin(app, _options, done) {
    app.setNotFoundHandler((request, reply) =>
      reply
        .code(404)
        .send(errorBody('NOT_FOUND', `Route ${request.method} ${request.url} not found`)),
    );

    app.setErrorHandler<FastifyError>((error, request, reply) => {
      if (hasZodFastifySchemaValidationErrors(error)) {
        return reply
          .code(400)
          .send(errorBody('VALIDATION_ERROR', 'Invalid request', toDetails(error.validation)));
      }

      if (error instanceof DomainError) {
        const details = error.fieldErrors && { fieldErrors: error.fieldErrors, formErrors: [] };
        return reply.code(error.statusCode).send(errorBody(error.code, error.message, details));
      }

      if (error.statusCode === 429) {
        return reply
          .code(429)
          .send(errorBody('RATE_LIMITED', 'Too many requests, please try again later'));
      }

      // Fastify's own client errors (malformed JSON, unsupported media type…) are safe to expose.
      if (error.statusCode !== undefined && error.statusCode >= 400 && error.statusCode < 500) {
        return reply.code(error.statusCode).send(errorBody('VALIDATION_ERROR', error.message));
      }

      request.log.error({ err: error }, 'Unhandled error');
      return reply.code(500).send(errorBody('INTERNAL_ERROR', 'Internal server error'));
    });

    done();
  },
  { name: 'errors', fastify: '5.x' },
);
