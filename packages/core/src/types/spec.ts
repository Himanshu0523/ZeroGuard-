export interface ParsedSpec {
  version: string;               // '2.0' | '3.0' | '3.1'
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{ url: string; description?: string }>;
  paths: Record<string, PathItem>;
  components?: {
    securitySchemes?: Record<string, SecurityScheme>;
    schemas?: Record<string, SchemaObject>;
    parameters?: Record<string, ParameterObject>;
    responses?: Record<string, ResponseObject>;
  };
  security?: SecurityRequirement[];
  raw: unknown; // original dereferenced object
}

export interface PathItem {
  summary?: string;
  description?: string;
  parameters?: ParameterObject[]; // shared parameters
  get?: Operation;
  put?: Operation;
  post?: Operation;
  delete?: Operation;
  options?: Operation;
  head?: Operation;
  patch?: Operation;
  trace?: Operation;
}

export interface Operation {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  responses: Record<string, ResponseObject>;
  security?: SecurityRequirement[];
  deprecated?: boolean;
  servers?: Array<{ url: string; description?: string }>;
  [key: string]: unknown; // allow extensions like x-rate-limit
}

export interface ParameterObject {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  required?: boolean;
  schema?: SchemaObject;
  description?: string;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  [key: string]: unknown;
}

export interface RequestBodyObject {
  description?: string;
  required?: boolean;
  content: Record<string, MediaTypeObject>;
}

export interface MediaTypeObject {
  schema?: SchemaObject;
  example?: unknown;
  examples?: Record<string, ExampleObject>;
}

export interface ResponseObject {
  description: string;
  headers?: Record<string, unknown>;
  content?: Record<string, MediaTypeObject>;
  links?: Record<string, unknown>;
}

export interface SchemaObject {
  type?: string;
  properties?: Record<string, SchemaObject | ReferenceObject>;
  required?: string[];
  items?: SchemaObject | ReferenceObject;
  additionalProperties?: boolean | SchemaObject;
  description?: string;
  example?: unknown;
  deprecated?: boolean;
  [key: string]: unknown;
}

export interface ReferenceObject {
  $ref: string;
}

export interface SecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect' | 'mutualTLS';
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
  flows?: unknown;
  openIdConnectUrl?: string;
}

export interface SecurityRequirement {
  [name: string]: string[];
}

export interface ExampleObject {
  summary?: string;
  description?: string;
  value?: unknown;
  externalValue?: string;
}
