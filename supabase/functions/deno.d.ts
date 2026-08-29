declare namespace Deno {
  namespace env {
    function get(key: string): string | undefined;
  }
  function serve(handler: (request: Request) => Response | Promise<Response>): void;
}

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  type QueryBuilder = {
    select(columns: string): QueryBuilder;
    update(values: Record<string, unknown>): QueryBuilder;
    eq(column: string, value: string): QueryBuilder;
    single<T = Record<string, unknown>>(): Promise<{ data: T | null; error: unknown }>;
  };

  export function createClient(
    url: string,
    key: string,
    options?: { global?: { headers?: Record<string, string> } },
  ): {
    auth: {
      getUser(): Promise<{ data: { user: { id: string } | null } }>;
    };
    from(table: string): QueryBuilder;
  };
}
