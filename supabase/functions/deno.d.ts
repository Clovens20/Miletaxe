declare namespace Deno {
  namespace env {
    function get(key: string): string | undefined;
  }
  function serve(handler: (request: Request) => Response | Promise<Response>): void;
}

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export type AuthUser = {
    id: string;
    email?: string;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  };

  type QueryBuilder = {
    select(columns: string): QueryBuilder;
    insert(values: Record<string, unknown>): QueryBuilder;
    update(values: Record<string, unknown>): QueryBuilder;
    eq(column: string, value: string): QueryBuilder;
    single<T = Record<string, unknown>>(): Promise<{ data: T | null; error: unknown }>;
    then: Promise<{ data: unknown; error: unknown }>['then'];
  };

  type AdminAuth = {
    getUser(): Promise<{ data: { user: AuthUser | null } }>;
    admin: {
      updateUserById(
        id: string,
        attributes: {
          password?: string;
          email_confirm?: boolean;
          user_metadata?: Record<string, unknown>;
          app_metadata?: Record<string, unknown>;
        },
      ): Promise<{ data: { user: AuthUser } | null; error: unknown }>;
      createUser(attributes: {
        email: string;
        password: string;
        email_confirm?: boolean;
        user_metadata?: Record<string, unknown>;
        app_metadata?: Record<string, unknown>;
      }): Promise<{ data: { user: AuthUser | null }; error: unknown }>;
      listUsers(params?: { page?: number; perPage?: number }): Promise<{
        data: { users: AuthUser[] };
        error: unknown;
      }>;
      deleteUser(id: string): Promise<{ error: unknown }>;
    };
  };

  export function createClient(
    url: string,
    key: string,
    options?: { global?: { headers?: Record<string, string> } },
  ): {
    auth: AdminAuth;
    from(table: string): QueryBuilder;
    rpc(name: string, args?: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
    storage: {
      from(bucket: string): {
        list(
          path?: string,
          options?: { limit?: number },
        ): Promise<{ data: { id?: string; name: string }[] | null; error: unknown }>;
        remove(paths: string[]): Promise<{ error: unknown }>;
      };
    };
  };
}
